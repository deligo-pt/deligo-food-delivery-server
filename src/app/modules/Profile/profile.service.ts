/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import {
  ROLE_COLLECTION_MAP,
  USER_STATUS,
} from '../../constant/GlobalConstant/user.constant';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TUserProfileUpdate } from './profile.interface';
import { ALL_USER_MODELS } from '../Auth/auth.constant';
import { sendMobileOtp } from '../../utils/sendMobileOtp';
import { EmailHelper } from '../../utils/emailSender';
import generateOtp from '../../utils/generateOtp';
import { verifyMobileOtp } from '../../utils/verifyMobileOtp';
import mongoose from 'mongoose';
import { generateReferralCode } from '../../utils/generateReferralCode';
import { RedisService } from '../../config/redis';
import { findUserById } from '../../utils/findUserByEmailOrId';

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

// update my profile service
const updateMyProfile = async (
  currentUser: TCurrentUser,
  profilePhoto: string | null,
  payload: Partial<TUserProfileUpdate>,
) => {
  const modelName =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];
  const model = mongoose.model(modelName) as any;

  if (!currentUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found.');
  }

  // -----------------------------
  // Account Status Check
  // -----------------------------
  if (currentUser.status !== USER_STATUS.APPROVED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${currentUser.status.toLowerCase()}. Please contact support.`,
    );
  }

  // -----------------------------
  // Referral Code Generation (New Logic)
  // -----------------------------
  if (!currentUser.referralCode) {
    const firstName =
      payload.name?.firstName || currentUser.name.firstName || 'USER';
    const newReferralCode = await generateReferralCode(firstName);

    payload.referralCode = newReferralCode;
  }

  // -----------------------------
  // Payload Validation
  // -----------------------------
  if (payload.profilePhoto) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Profile photo must be uploaded as a file, not in text.',
    );
  }

  if (currentUser.role === 'CUSTOMER' && payload.contactNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Customers cannot update contact number. Please contact support.',
    );
  }

  if (payload.NIF && currentUser.role !== 'CUSTOMER') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Only customers can update NIF. Please contact support.',
    );
  }

  // -----------------------------
  // Profile Photo Upload Handle
  // -----------------------------
  if (profilePhoto) {
    // Delete old photo (non-blocking but logged)
    if (currentUser.profilePhoto) {
      const oldPhoto = currentUser.profilePhoto;
      deleteSingleImageFromCloudinary(oldPhoto).catch((err) => {
        console.error(err);
      });
    }

    payload.profilePhoto = profilePhoto;
  }

  // -----------------------------
  // Update User Document
  // -----------------------------
  const updatedUser = await model.findOneAndUpdate(
    { userId: currentUser.userId },
    { $set: payload },
    { new: true },
  );

  if (!updatedUser) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update profile.',
    );
  }

  return updatedUser;
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

  // Prevent duplicate mobile number across ALL models
  if (payload.contactNumber) {
    for (const Model of ALL_USER_MODELS) {
      const exists = await Model.exists({
        contactNumber: payload.contactNumber,
      });
      if (exists) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'This mobile number is already registered.',
        );
      }
    }
  }

  // Prevent duplicate email across ALL models
  if (payload.email) {
    for (const Model of ALL_USER_MODELS) {
      const exists = await Model.exists({ email: payload.email });
      if (exists) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'This email is already registered.',
        );
      }
    }
  }

  // Mobile OTP flow
  if (payload.contactNumber) {
    const globalMobileLockKey = `lock:mobile:${payload.contactNumber}`;
    const isLockedBySomeone = await RedisService.get(globalMobileLockKey);

    // If locked by someone else, block
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
      message: 'OTP sent to your mobile number. Please verify to update.',
    };
  }

  // Email OTP flow
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
        user: currentUser?.name?.firstName || 'Customer',
      },
      'verify-email',
    );

    try {
      await EmailHelper.sendEmail(
        payload.email,
        emailHtml,
        'Verify your email for DeliGo',
      );
    } catch (error: any) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to send verification email',
      );
    }

    return {
      message: 'OTP sent to your email. Please verify to update.',
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

  if (!otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'OTP is required.');
  }

  const result = await findUserById({ userId: currentUserId });
  const targetUser = result?.user;

  if (!targetUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found.');
  }

  if (type === 'mobile') {
    const redisMobileKey = `otp:profile-update-mobile:${currentUserId}`;
    const cachedData = await RedisService.get(redisMobileKey);

    if (!cachedData) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'OTP has expired or no pending mobile update request found.',
      );
    }

    const parsedData =
      typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
    const { mobileOtpId, pendingContactNumber } = parsedData;

    const res = await verifyMobileOtp(mobileOtpId, otp);
    if (!res?.data?.verified) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
    }

    for (const Model of ALL_USER_MODELS) {
      const isDuplicate = await Model.exists({
        contactNumber: pendingContactNumber,
      });
      if (isDuplicate) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'This mobile number is already registered by another account.',
        );
      }
    }

    // Update User
    targetUser.contactNumber = pendingContactNumber;
    await targetUser.save();

    // Clean up Redis
    const globalMobileLockKey = `lock:mobile:${pendingContactNumber}`;
    await RedisService.del(redisMobileKey);
    await RedisService.del(globalMobileLockKey);

    return { message: 'Contact number updated successfully.' };
  }

  if (type === 'email') {
    const redisEmailKey = `otp:profile-update-email:${currentUserId}`;
    const cachedData = await RedisService.get(redisEmailKey);

    console.log(cachedData);

    if (!cachedData) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'OTP has expired or no pending email update request found.',
      );
    }

    const parsedData =
      typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
    const { otp: cachedOtp, pendingEmail } = parsedData;

    if (String(cachedOtp) !== String(otp)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP.');
    }

    // CRITICAL FIX: Cross-model duplicate check on update
    for (const Model of ALL_USER_MODELS) {
      const isDuplicate = await Model.exists({ email: pendingEmail });
      if (isDuplicate) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'This email is already registered by another account.',
        );
      }
    }

    // Update User
    targetUser.email = pendingEmail;
    await targetUser.save();

    // Clean up Redis
    const globalEmailLockKey = `lock:email:${pendingEmail}`;
    await RedisService.del(redisEmailKey);
    await RedisService.del(globalEmailLockKey);

    return { message: 'Email address updated successfully.' };
  }

  throw new AppError(httpStatus.BAD_REQUEST, 'Invalid update type.');
};

export const ProfileServices = {
  getMyProfile,
  updateMyProfile,
  sendOtp,
  updateEmailOrContactNumber,
};
