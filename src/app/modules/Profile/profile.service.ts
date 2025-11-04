import { JwtPayload } from 'jsonwebtoken';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { TImageFile } from '../../interfaces/image.interface';
import { TUserProfileUpdate } from './profile.interface';
import { Customer } from '../Customer/customer.model';
import { USER_STATUS } from '../../constant/user.const';

const getMyProfile = async (user: JwtPayload) => {
  const profile = await Customer.findOne({
    email: user.email,
    status: USER_STATUS.APPROVED,
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
    status: USER_STATUS.APPROVED,
  };

  const profile = await Customer.findOne(filter);

  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, 'User profile does not exist!');
  }

  if (profilePhoto) {
    data.profilePhoto = profilePhoto.path;
  } else {
    delete data.profilePhoto;
  }

  return await Customer.findOneAndUpdate(filter, data, { new: true });
};

export const ProfileServices = {
  getMyProfile,
  updateMyProfile,
};
