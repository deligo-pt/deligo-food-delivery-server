/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser, USER_STATUS } from '../../constant/user.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TUserProfileUpdate } from './profile.interface';
import { ALL_USER_MODELS } from '../Auth/auth.constant';
import { sendMobileOtp } from '../../utils/sendMobileOtp';
import { EmailHelper } from '../../utils/emailSender';
import generateOtp from '../../utils/generateOtp';
import { verifyMobileOtp } from '../../utils/verifyMobileOtp';

// get my profile service
const getMyProfile = async (currentUser: AuthUser) => {
  // -----------------------------
  // Find User
  // -----------------------------
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const user = result?.user;

  // -----------------------------
  // User Exists Check
  // -----------------------------
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not exist!');
  }

  // -----------------------------
  // Status Check
  // -----------------------------
  if (user.status !== USER_STATUS.APPROVED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${user.status.toLowerCase()}. Please contact support.`
    );
  }
  return user;
};

// update my profile service
const updateMyProfile = async (
  currentUser: AuthUser,
  profilePhoto: string | null,
  payload: Partial<TUserProfileUpdate>
) => {
  // -----------------------------
  // Find User
  // -----------------------------
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const user = result?.user;
  const Model = result?.model;

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found.');
  }

  // -----------------------------
  // Account Status Check
  // -----------------------------
  if (user.status !== USER_STATUS.APPROVED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${user.status.toLowerCase()}. Please contact support.`
    );
  }

  // -----------------------------
  // Payload Validation
  // -----------------------------
  if (payload.profilePhoto) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Profile photo must be uploaded as a file, not in text.'
    );
  }

  if (user.role === 'CUSTOMER' && payload.contactNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Customers cannot update contact number. Please contact support.'
    );
  }

  // -----------------------------
  // Profile Photo Upload Handle
  // -----------------------------
  if (profilePhoto) {
    // Delete old photo (non-blocking but logged)
    if (user.profilePhoto) {
      const oldPhoto = user.profilePhoto;
      deleteSingleImageFromCloudinary(oldPhoto).catch((err) => {
        throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
      });
    }

    payload.profilePhoto = profilePhoto;
  }

  // -----------------------------
  // Update User Document
  // -----------------------------
  const updatedUser = await Model?.findOneAndUpdate(
    { userId: user.userId },
    { $set: payload },
    { new: true }
  );

  if (!updatedUser) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update profile.'
    );
  }

  return updatedUser;
};

// send otp service
const sendOtp = async (
  currentUser: AuthUser,
  payload: { contactNumber?: string; email?: string }
) => {
  // --------------------------------------------------
  // Validate input
  // --------------------------------------------------
  if (!payload?.contactNumber && !payload?.email) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email or contact number is required'
    );
  }

  // --------------------------------------------------
  // Get logged-in user
  // --------------------------------------------------
  const { user: loggedInUser } = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (!loggedInUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // --------------------------------------------------
  // Prevent duplicate mobile number
  // --------------------------------------------------
  if (payload.contactNumber) {
    for (const Model of ALL_USER_MODELS) {
      const exists = await Model.exists({
        contactNumber: payload.contactNumber,
      });

      if (exists) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'This mobile number is already registered.'
        );
      }
    }
  }

  // --------------------------------------------------
  // Prevent duplicate email
  // --------------------------------------------------
  if (payload.email) {
    for (const Model of ALL_USER_MODELS) {
      const exists = await Model.exists({ email: payload.email });

      if (exists) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'This email is already registered.'
        );
      }
    }
  }

  // --------------------------------------------------
  // Mobile OTP flow
  // --------------------------------------------------
  if (payload.contactNumber) {
    const response = await sendMobileOtp(payload.contactNumber);
    const mobileOtpId = response?.data?.id;

    loggedInUser.mobileOtpId = mobileOtpId;
    loggedInUser.pendingContactNumber = payload.contactNumber;

    await loggedInUser.save();

    return {
      message: 'OTP sent to your mobile number. Please verify to update.',
    };
  }

  // --------------------------------------------------
  // Email OTP flow
  // --------------------------------------------------
  if (payload.email) {
    const { otp, otpExpires } = generateOtp();

    loggedInUser.otp = otp;
    loggedInUser.isOtpExpired = otpExpires;
    loggedInUser.pendingEmail = payload.email;

    await loggedInUser.save();

    const emailHtml = await EmailHelper.createEmailContent(
      {
        otp,
        userEmail: payload.email,
        currentYear: new Date().getFullYear(),
        date: new Date().toDateString(),
        user: loggedInUser?.name?.firstName || 'Customer',
      },
      'verify-email'
    );

    try {
      await EmailHelper.sendEmail(
        payload.email,
        emailHtml,
        'Verify your email for DeliGo'
      );
    } catch (error: any) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to send verification email'
      );
    }

    return {
      message: 'OTP sent to your email. Please verify to update.',
    };
  }
};

// update email or contact number service
const updateEmailOrContactNumber = async (
  currentUser: AuthUser,
  otp: string
) => {
  const { user: loggedInUser } = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (!loggedInUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!loggedInUser.pendingEmail && !loggedInUser.pendingContactNumber) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No pending change found.');
  }

  if (!otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'OTP is required.');
  }

  if (loggedInUser.pendingEmail) {
    // verify otp
    if (loggedInUser.otp !== otp) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
    }
    if (loggedInUser.isOtpExpired && loggedInUser.isOtpExpired < new Date()) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'OTP has expired');
    }

    loggedInUser.otp = undefined;
    loggedInUser.isOtpExpired = undefined;
    loggedInUser.email = loggedInUser.pendingEmail;
    loggedInUser.pendingEmail = null;
  }

  if (loggedInUser.pendingContactNumber) {
    const res = await verifyMobileOtp(
      loggedInUser.mobileOtpId as string,
      otp as string
    );
    if (!res?.data?.verified) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
    }
    loggedInUser.mobileOtpId = undefined;
    loggedInUser.contactNumber = loggedInUser.pendingContactNumber;
    loggedInUser.pendingContactNumber = null;
  }

  await loggedInUser.save();

  return {
    message: `${
      loggedInUser.pendingEmail ? 'Email' : 'Contact number'
    } updated successfully. Please login again to continue.`,
  };
};

export const ProfileServices = {
  getMyProfile,
  updateMyProfile,
  sendOtp,
  updateEmailOrContactNumber,
};
