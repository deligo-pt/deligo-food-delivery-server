/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import {
  AuthUser,
  ROLE_COLLECTION_MAP,
  USER_STATUS,
} from '../../constant/user.constant';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TUserProfileUpdate } from './profile.interface';
import { ALL_USER_MODELS } from '../Auth/auth.constant';
import { sendMobileOtp } from '../../utils/sendMobileOtp';
import { EmailHelper } from '../../utils/emailSender';
import generateOtp from '../../utils/generateOtp';
import { verifyMobileOtp } from '../../utils/verifyMobileOtp';
import { MoloniService } from '../Moloni/moloni.service';
import mongoose from 'mongoose';

// get my profile service
const getMyProfile = async (currentUser: AuthUser) => {
  // -----------------------------
  // Status Check
  // -----------------------------
  if (currentUser.status !== USER_STATUS.APPROVED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${currentUser.status.toLowerCase()}. Please contact support.`
    );
  }
  return currentUser;
};

// update my profile service
const updateMyProfile = async (
  currentUser: AuthUser,
  profilePhoto: string | null,
  payload: Partial<TUserProfileUpdate>
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
      `Your account is ${currentUser.status.toLowerCase()}. Please contact support.`
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

  if (currentUser.role === 'CUSTOMER' && payload.contactNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Customers cannot update contact number. Please contact support.'
    );
  }

  if (payload.NIF && currentUser.role !== 'CUSTOMER') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Only customers can update NIF. Please contact support.'
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
        throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
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
    { new: true }
  );

  if (!updatedUser) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update profile.'
    );
  }
  if (currentUser.role === 'CUSTOMER') {
    try {
      const moloniData = {
        name:
          `${updatedUser.name.firstName} ${updatedUser.name.lastName}`.trim() ||
          updatedUser.email,
        email: updatedUser.email,
        address: updatedUser.address?.street || 'Customer Address',
        zipCode: updatedUser.address?.postalCode || '1000-001',
        city: updatedUser.address?.city || 'Lisbon',
      };

      console.log(updatedUser.moloniCustomerId);
      if (!updatedUser.moloniCustomerId) {
        const newMoloniId = await MoloniService.createCustomer(moloniData);
        if (newMoloniId) {
          await model.findOneAndUpdate(
            { userId: currentUser.userId },
            { $set: { moloniCustomerId: String(newMoloniId) } }
          );
        }
      } else {
        await MoloniService.updateCustomer(
          Number(updatedUser.moloniCustomerId),
          moloniData
        );
      }
    } catch (error: any) {
      console.error('Moloni Sync Failed during profile update:', error.message);
    }
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

    currentUser.mobileOtpId = mobileOtpId;
    currentUser.pendingContactNumber = payload.contactNumber;

    await (currentUser as any).save();

    return {
      message: 'OTP sent to your mobile number. Please verify to update.',
    };
  }

  // --------------------------------------------------
  // Email OTP flow
  // --------------------------------------------------
  if (payload.email) {
    const { otp, otpExpires } = generateOtp();

    currentUser.otp = otp;
    currentUser.isOtpExpired = otpExpires;
    currentUser.pendingEmail = payload.email;

    await (currentUser as any).save();

    const emailHtml = await EmailHelper.createEmailContent(
      {
        otp,
        userEmail: payload.email,
        currentYear: new Date().getFullYear(),
        date: new Date().toDateString(),
        user: currentUser?.name?.firstName || 'Customer',
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
      otp as string
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
  updateMyProfile,
  sendOtp,
  updateEmailOrContactNumber,
};
