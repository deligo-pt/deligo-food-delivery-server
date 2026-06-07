/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import {
  ROLE_COLLECTION_MAP,
  USER_STATUS,
} from '../../constant/GlobalConstant/user.constant';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { sendMobileOtp } from '../../utils/sendMobileOtp';
import { EmailHelper } from '../../utils/emailSender';
import generateOtp from '../../utils/generateOtp';
import { verifyMobileOtp } from '../../utils/verifyMobileOtp';
import { RedisService } from '../../config/redis';
import { findUserById } from '../../utils/findUserByEmailOrId';
import { AuthUser } from '../AuthUser/authUser.model';
import mongoose from 'mongoose';

// get my profile service
const getMyProfile = async (currentUser: TCurrentUser) => {
  // -----------------------------
  // Status Check
  // -----------------------------
  if (currentUser.status !== USER_STATUS.APPROVED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${currentUser.status.toLowerCase()}. Please contact support.`,
    );
  }
  return currentUser;
};

// send otp service
const sendOtp = async (
  currentUser: TCurrentUser,
  payload: { contactNumber?: string; email?: string },
) => {
  if (!payload?.contactNumber && !payload?.email) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email or contact number is required',
    );
  }

  const currentUserId = currentUser.userId;
  const OTP_TTL_SECONDS = 300;

  if (payload.contactNumber) {
    const exists = await AuthUser.findOne({
      contactNumber: payload.contactNumber,
    });

    if (
      exists?.userId === currentUser.userId &&
      exists?.isContactNumberVerified
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This contact number is already linked to your account and verified. Please use another.',
      );
    }

    if (exists && exists?.userId !== currentUserId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This mobile number is already registered with another account.',
      );
    }
  }

  if (payload.email) {
    const exists = await AuthUser.findOne({
      email: payload.email,
    });

    if (exists?.userId === currentUser.userId && exists?.isEmailVerified) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This email is already linked to your account and verified. Please use another.',
      );
    }

    if (exists && exists?.userId !== currentUserId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This email is already registered with another account.',
      );
    }
  }

  if (payload.contactNumber) {
    const globalMobileLockKey = `lock:mobile:${payload.contactNumber}`;

    const isLockedBySomeone = await RedisService.get(globalMobileLockKey);

    if (isLockedBySomeone && isLockedBySomeone !== currentUserId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This mobile number is currently undergoing verification by another user. Please try again after 5 minutes.',
      );
    }

    const response = await sendMobileOtp(payload.contactNumber);
    const mobileOtpId = response?.data?.id;

    if (!mobileOtpId) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to receive OTP reference from gateway',
      );
    }

    await RedisService.set(globalMobileLockKey, currentUserId, OTP_TTL_SECONDS);

    const redisMobileKey = `otp:profile-update-mobile:${currentUserId}`;
    const redisMobileData = JSON.stringify({
      mobileOtpId,
      pendingContactNumber: payload.contactNumber,
    });

    await RedisService.set(redisMobileKey, redisMobileData, OTP_TTL_SECONDS);

    return {
      message:
        'OTP sent to your mobile number. Please verify within 5 minutes to update.',
    };
  }

  if (payload.email) {
    const globalEmailLockKey = `lock:email:${payload.email}`;

    const isEmailLocked = await RedisService.get(globalEmailLockKey);

    if (isEmailLocked && isEmailLocked !== currentUserId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This email address is currently undergoing verification by another user. Please try again after 5 minutes.',
      );
    }

    const { otp } = generateOtp();

    const redisEmailKey = `otp:profile-update-email:${currentUserId}`;
    const redisEmailData = JSON.stringify({
      otp,
      pendingEmail: payload.email,
    });

    await RedisService.set(globalEmailLockKey, currentUserId, OTP_TTL_SECONDS);
    await RedisService.set(redisEmailKey, redisEmailData, OTP_TTL_SECONDS);

    const emailHtml = await EmailHelper.createEmailContent(
      {
        otp,
        userEmail: payload.email,
        currentYear: new Date().getFullYear(),
        date: new Date().toDateString(),
        user: currentUser?.name?.firstName || 'User',
      },
      'verify-email',
    );

    EmailHelper.sendEmail(
      payload.email,
      emailHtml,
      'Verify your email for DeliGo',
    ).catch(async (err) => {
      console.error('Email sending failed:', err);
      await RedisService.del(redisEmailKey);
      await RedisService.del(globalEmailLockKey);
    });

    return {
      message:
        'OTP sent to your email. Please verify within 5 minutes to update.',
    };
  }
};

// update email or contact number
const updateEmailOrContactNumber = async (
  currentUser: TCurrentUser,
  payload: {
    otp: string;
    type: 'email' | 'mobile';
  },
) => {
  const { otp, type } = payload;

  const modelName =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];
  const Model = mongoose.model(modelName) as any;

  const currentUserId = currentUser.userId;

  if (type === 'email') {
    const redisEmailKey = `otp:profile-update-email:${currentUserId}`;
    const globalEmailLockKey = `lock:email`;

    const cachedData = await RedisService.get(redisEmailKey);
    if (!cachedData) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'OTP has expired or is invalid. Please request a new one.',
      );
    }

    const { otp: savedOtp, pendingEmail } = cachedData as any;

    if (savedOtp !== otp) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP code.');
    }

    await AuthUser.findOneAndUpdate(
      { userId: currentUserId },
      {
        email: pendingEmail,
      },
    );

    await Model.findOneAndUpdate(
      { userId: currentUserId },
      {
        email: pendingEmail,
      },
    );

    await RedisService.del(redisEmailKey);
    await RedisService.del(`${globalEmailLockKey}:${pendingEmail}`);

    return {
      message: 'Email updated successfully.',
    };
  }

  if (type === 'mobile') {
    const redisMobileKey = `otp:profile-update-mobile:${currentUserId}`;

    const cachedData = await RedisService.get(redisMobileKey);
    if (!cachedData) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'OTP has expired or is invalid. Please request a new one.',
      );
    }

    console.log({ cachedData });

    const { mobileOtpId, pendingContactNumber } = cachedData as any;
    const isGatewayOtpValid = await verifyMobileOtp(mobileOtpId, otp);
    if (!isGatewayOtpValid) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'Invalid or expired OTP code.',
      );
    }

    await AuthUser.findOneAndUpdate(
      { userId: currentUserId },
      {
        contactNumber: pendingContactNumber,
      },
    );

    await Model.findOneAndUpdate(
      { userId: currentUserId },
      {
        contactNumber: pendingContactNumber,
      },
    );

    await RedisService.del(redisMobileKey);

    return {
      message: 'Contact number updated successfully.',
    };
  }
};

export const ProfileServices = {
  getMyProfile,
  sendOtp,
  updateEmailOrContactNumber,
};
