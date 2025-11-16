import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser, USER_STATUS } from '../../constant/user.const';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';

const getMyProfile = async (currentUser: AuthUser) => {
  const result = await findUserByEmailOrId({
    email: currentUser.email,
    userId: currentUser.id,
    isDeleted: false,
  });

  const user = result?.user;

  if (user?.status !== USER_STATUS.APPROVED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${user?.status.toLowerCase()}. Please contact support.`
    );
  }

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not exist!');
  }

  return user;
};

const updateMyProfile = async (
  currentUser: AuthUser,
  profilePhoto?: string
) => {
  const result = await findUserByEmailOrId({
    email: currentUser.email,
    userId: currentUser.id,
    isDeleted: false,
  });
  const user = result?.user;

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not exist!');
  }

  if (user?.status !== USER_STATUS.APPROVED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${user?.status.toLowerCase()}. Please contact support.`
    );
  }

  if (!profilePhoto) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No profile photo provided!');
  }

  if (user?.profilePhoto) {
    const oldProfilePhoto = user?.profilePhoto;
    deleteSingleImageFromCloudinary(oldProfilePhoto).catch((err) => {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
    });
  }

  if (profilePhoto) {
    user.profilePhoto = profilePhoto;
  }

  await user.save();
  return user;
};

export const ProfileServices = {
  getMyProfile,
  updateMyProfile,
};
