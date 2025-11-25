import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser, USER_STATUS } from '../../constant/user.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TUserProfileUpdate } from './profile.interface';

// get my profile service
const getMyProfile = async (currentUser: AuthUser) => {
  // -----------------------------
  // 1. Find User
  // -----------------------------
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const user = result?.user;

  // -----------------------------
  // 2. User Exists Check
  // -----------------------------
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not exist!');
  }

  // -----------------------------
  // 3. Status Check
  // -----------------------------
  if (user.status !== USER_STATUS.APPROVED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${user.status.toLowerCase()}. Please contact support.`
    );
  }

  // -----------------------------
  // 4. Return User Profile
  // -----------------------------
  return user;
};

// update my profile service
const updateMyProfile = async (
  currentUser: AuthUser,
  profilePhoto: string | null,
  payload: Partial<TUserProfileUpdate>
) => {
  // -----------------------------
  // 1. Find User
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
  // 2. Account Status Check
  // -----------------------------
  if (user.status !== USER_STATUS.APPROVED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${user.status.toLowerCase()}. Please contact support.`
    );
  }

  // -----------------------------
  // 3. Payload Validation
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
  // 4. Profile Photo Upload Handle
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
  // 5. Update User Document
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

export const ProfileServices = {
  getMyProfile,
  updateMyProfile,
};
