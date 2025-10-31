import { JwtPayload } from 'jsonwebtoken';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { TImageFile } from '../../interfaces/image.interface';
import { TUserProfileUpdate } from './profile.interface';
import { USER_STATUS } from '../User/user.constant';
import { User } from '../User/user.model';

const getMyProfile = async (user: JwtPayload) => {
  const profile = await User.findOne({
    email: user.email,
    status: USER_STATUS.ACTIVE,
  });

  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not exist!');
  }

  return profile;
};

const updateMyProfile = async (
  user: JwtPayload,
  data: Partial<TUserProfileUpdate>,
  profilePhoto: TImageFile
) => {
  const filter = {
    email: user.email,
    status: USER_STATUS.ACTIVE,
  };

  const profile = await User.findOne(filter);

  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, 'User profile does not exixts!');
  }

  if (profilePhoto) {
    data.profilePhoto = profilePhoto.path;
  } else {
    delete data.profilePhoto;
  }

  return await User.findOneAndUpdate(filter, data, { new: true });
};

export const ProfileServices = {
  getMyProfile,
  updateMyProfile,
};
