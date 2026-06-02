/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import {
  ROLE_COLLECTION_MAP,
  USER_STATUS,
} from '../../constant/GlobalConstant/user.constant';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TUserProfileUpdate } from './profile.interface';
import { ALL_USER_MODELS } from '../Auth/auth.constant';
import { sendMobileOtp } from '../../utils/sendMobileOtp';
import { EmailHelper } from '../../utils/emailSender';
import generateOtp from '../../utils/generateOtp';
import { verifyMobileOtp } from '../../utils/verifyMobileOtp';
import mongoose from 'mongoose';
import { generateReferralCode } from '../../utils/generateReferralCode';
import { TAuthUser } from '../AuthUser/authUser.interface';
import { AuthUser } from '../AuthUser/authUser.model';
import { RedisService } from '../../config/redis';

// get my profile service
const getMyProfile = async (currentUser: TAuthUser) => {
  const userModel = mongoose.model(currentUser.onModel);
  // -----------------------------
  // Status Check
  // -----------------------------
  if (currentUser.status !== USER_STATUS.APPROVED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${currentUser.status.toLowerCase()}. Please contact support.`,
    );
  }

  const userProfile = await userModel.findById(currentUser.userObjectId).lean();
  if (!userProfile) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Profile details not found in the system',
    );
  }

  return {
    ...userProfile,
    role: currentUser.role,
    status: currentUser.status,
    email: currentUser.email,
    contactNumber: currentUser.contactNumber,
    authUserId: currentUser._id,
  };
};

// send otp service
const sendOtp = async (
  currentUser: TAuthUser,
  payload: { contactNumber?: string; email?: string },
) => {
  if (!payload?.contactNumber && !payload?.email) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email or contact number is required',
    );
  }

  const currentAuthUserId = currentUser._id.toString();
  const OTP_TTL_SECONDS = 300;

  if (payload.contactNumber) {
    const exists = await AuthUser.findOne({
      contactNumber: payload.contactNumber,
      _id: { $ne: currentUser._id },
    });

    if (exists) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This mobile number is already registered with another account.',
      );
    }
  }

  if (payload.email) {
    const exists = await AuthUser.findOne({
      email: payload.email,
      _id: { $ne: currentUser._id },
    });

    if (exists) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This email is already registered with another account.',
      );
    }
  }

  if (payload.contactNumber) {
    const globalMobileLockKey = `lock:mobile:${payload.contactNumber}`;

    const isLockedBySomeone = await RedisService.get(globalMobileLockKey);

    if (isLockedBySomeone && isLockedBySomeone !== currentAuthUserId) {
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

    await RedisService.set(
      globalMobileLockKey,
      currentAuthUserId,
      OTP_TTL_SECONDS,
    );

    const redisMobileKey = `otp:profile-update-mobile:${currentAuthUserId}`;
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

    if (isEmailLocked && isEmailLocked !== currentAuthUserId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This email address is currently undergoing verification by another user. Please try again after 5 minutes.',
      );
    }

    const { otp } = generateOtp();

    const redisEmailKey = `otp:profile-update-email:${currentAuthUserId}`;
    const redisEmailData = JSON.stringify({
      otp,
      pendingEmail: payload.email,
    });

    await RedisService.set(
      globalEmailLockKey,
      currentAuthUserId,
      OTP_TTL_SECONDS,
    );
    await RedisService.set(redisEmailKey, redisEmailData, OTP_TTL_SECONDS);

    const userModel = mongoose.model(currentUser.onModel);
    const userProfile = await userModel
      .findById(currentUser.userObjectId)
      .lean();
    const customerFirstName = (userProfile as any)?.name?.firstName || 'User';

    const emailHtml = await EmailHelper.createEmailContent(
      {
        otp,
        userEmail: payload.email,
        currentYear: new Date().getFullYear(),
        date: new Date().toDateString(),
        user: customerFirstName,
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

// update email or contact number service
const updateEmailOrContactNumber = async (
  currentUser: TAuthUser,
  otp: string,
) => {
  if (!currentUser.pendingEmail && !currentUser.pendingContactNumber) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No pending change found.');
  }

  if (!otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'OTP is required.');
  }

  if (currentUser.pendingEmail) {
    // verify otp
    if (currentUser.otp !== otp) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
    }
    if (currentUser.isOtpExpired && currentUser.isOtpExpired < new Date()) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'OTP has expired');
    }

    currentUser.otp = undefined;
    currentUser.isOtpExpired = undefined;
    currentUser.email = currentUser.pendingEmail;
    currentUser.pendingEmail = '';
  }

  if (currentUser.pendingContactNumber) {
    const res = await verifyMobileOtp(
      currentUser.mobileOtpId as string,
      otp as string,
    );
    if (!res?.data?.verified) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
    }
    currentUser.mobileOtpId = undefined;
    currentUser.contactNumber = currentUser.pendingContactNumber;
    currentUser.pendingContactNumber = '';
  }

  await (currentUser as any).save();

  return {
    message: `${
      currentUser.pendingEmail ? 'Email' : 'Contact number'
    } updated successfully.`,
  };
};

export const ProfileServices = {
  getMyProfile,
  sendOtp,
  updateEmailOrContactNumber,
};
