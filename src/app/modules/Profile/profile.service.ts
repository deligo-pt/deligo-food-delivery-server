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
import { AuthUser } from '../AuthUser/authUser.model';
import mongoose from 'mongoose';
import { TMessageKey } from '../../errors/messages';

// get my profile service
const getMyProfile = async (currentUser: TCurrentUser) => {
  // -----------------------------
  // Status Check
  // -----------------------------
  if (currentUser.status !== USER_STATUS.APPROVED) {
    throw new AppError(httpStatus.FORBIDDEN, 'ACCOUNT_STATUS_CONTACT_SUPPORT', {
      status: currentUser.status,
    });
  }
  return {
    messageKey: 'MY_PROFILE_RETRIEVED_SUCCESS' as TMessageKey,
    data: currentUser,
  };
};

// send otp service
const sendOtp = async (
  currentUser: TCurrentUser,
  payload: { contactNumber?: string; email?: string },
) => {
  if (!payload?.contactNumber && !payload?.email) {
    throw new AppError(httpStatus.BAD_REQUEST, 'EMAIL_OR_CONTACT_REQUIRED');
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
        'CONTACT_ALREADY_LINKED_AND_VERIFIED',
      );
    }

    if (exists && exists?.userId !== currentUserId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'MOBILE_ALREADY_REGISTERED_ANOTHER_ACCOUNT',
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
        'EMAIL_ALREADY_LINKED_AND_VERIFIED',
      );
    }

    if (exists && exists?.userId !== currentUserId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'EMAIL_ALREADY_REGISTERED_ANOTHER_ACCOUNT',
      );
    }
  }

  if (payload.contactNumber) {
    const globalMobileLockKey = `lock:mobile:${payload.contactNumber}`;

    const isLockedBySomeone = await RedisService.get(globalMobileLockKey);

    if (isLockedBySomeone && isLockedBySomeone !== currentUserId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'MOBILE_UNDERGOING_VERIFICATION_BY_ANOTHER_USER',
      );
    }

    const response = await sendMobileOtp(payload.contactNumber);
    const mobileOtpId = response?.data?.id;

    if (!mobileOtpId) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'FAILED_TO_RECEIVE_OTP_REFERENCE_FROM_GATEWAY',
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
      messageKey: 'MOBILE_OTP_SENT_SUCCESS' as TMessageKey,
      data: null,
    };
  }

  if (payload.email) {
    const globalEmailLockKey = `lock:email:${payload.email}`;

    const isEmailLocked = await RedisService.get(globalEmailLockKey);

    if (isEmailLocked && isEmailLocked !== currentUserId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'EMAIL_UNDERGOING_VERIFICATION_BY_ANOTHER_USER',
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
      void err;
      await RedisService.del(redisEmailKey);
      await RedisService.del(globalEmailLockKey);
    });

    return {
      messageKey: 'EMAIL_OTP_SENT_SUCCESS' as TMessageKey,
      data: null,
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
  const currentUserId = currentUser.userId;

  const modelName =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];
  if (!modelName) {
    throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_USER_ROLE_MAPPING');
  }
  const Model = mongoose.model(modelName);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (type === 'email') {
      const redisEmailKey = `otp:profile-update-email:${currentUserId}`;
      const globalEmailLockKey = `lock:email`;

      const cachedRawData = await RedisService.get(redisEmailKey);
      if (!cachedRawData) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'OTP_EXPIRED_OR_INVALID_REQUEST_NEW',
        );
      }

      const cachedData =
        typeof cachedRawData === 'string'
          ? JSON.parse(cachedRawData)
          : cachedRawData;
      const { otp: savedOtp, pendingEmail } = cachedData;

      if (savedOtp !== otp) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_OTP_CODE');
      }

      await AuthUser.findOneAndUpdate(
        { userId: currentUserId },
        { email: pendingEmail, isEmailVerified: true },
        { session },
      );

      await Model.findOneAndUpdate(
        { userId: currentUserId },
        { email: pendingEmail },
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      await RedisService.del(redisEmailKey);
      await RedisService.del(`${globalEmailLockKey}:${pendingEmail}`);

      return {
        messageKey: 'EMAIL_UPDATED_SUCCESS' as TMessageKey,
        data: null,
      };
    }

    if (type === 'mobile') {
      const redisMobileKey = `otp:profile-update-mobile:${currentUserId}`;

      const cachedRawData = await RedisService.get(redisMobileKey);
      if (!cachedRawData) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'OTP_EXPIRED_OR_INVALID_REQUEST_NEW',
        );
      }

      const cachedData =
        typeof cachedRawData === 'string'
          ? JSON.parse(cachedRawData)
          : cachedRawData;
      const { mobileOtpId, pendingContactNumber } = cachedData;

      const isGatewayOtpValid = await verifyMobileOtp(mobileOtpId, otp);
      if (!isGatewayOtpValid) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'INVALID_OR_EXPIRED_OTP_CODE',
        );
      }

      await AuthUser.findOneAndUpdate(
        { userId: currentUserId },
        { contactNumber: pendingContactNumber },
        { session },
      );

      await Model.findOneAndUpdate(
        { userId: currentUserId },
        { contactNumber: pendingContactNumber },
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      await RedisService.del(redisMobileKey);

      return {
        messageKey: 'CONTACT_NUMBER_UPDATED_SUCCESS' as TMessageKey,
        data: null,
      };
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const ProfileServices = {
  getMyProfile,
  sendOtp,
  updateEmailOrContactNumber,
};
