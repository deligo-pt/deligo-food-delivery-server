/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import {
  ROLE_COLLECTION_MAP,
  TUserRole,
} from '../constant/GlobalConstant/user.constant';
import { AuthUser } from '../modules/AuthUser/authUser.model';
import mongoose from 'mongoose';

export const findUserById = async ({
  userId,
  isDeleted = false,
}: {
  userId: string;
  isDeleted?: boolean;
}) => {
  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'USER_ID_MUST_BE_PROVIDED');
  }

  const existingUser = await AuthUser.findOne({ userId });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND');
  }

  const role = existingUser?.role;

  if (role) {
    const modelName = ROLE_COLLECTION_MAP[role as TUserRole];
    const Model = mongoose.model(modelName);

    if (!Model) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'UNAUTHORIZED_ROLE', {
        role,
      });
    }

    const foundUser = await Model.findOne({
      userId,
      isDeleted,
    });
    if (foundUser) {
      return { user: foundUser, model: Model };
    }
  }
  throw new AppError(httpStatus.NOT_FOUND, 'NO_USER_FOUND_WITH_ID', { userId });
};

export const findUserByEmail = async ({
  email,
  isDeleted = false,
}: {
  email: string;
  isDeleted?: boolean;
}) => {
  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, 'EMAIL_MUST_BE_PROVIDED');
  }
  const existingUser = await AuthUser.findOne({ email });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND');
  }

  const role = existingUser?.role;

  if (role) {
    const modelName = ROLE_COLLECTION_MAP[role as TUserRole];
    const Model = mongoose.model(modelName);

    if (!Model) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'UNAUTHORIZED_ROLE', {
        role,
      });
    }

    const foundUser = await Model.findOne({
      email,
      isDeleted,
    });
    if (foundUser) {
      return { user: foundUser, model: Model };
    }
  }
  throw new AppError(httpStatus.NOT_FOUND, 'NO_USER_FOUND_WITH_EMAIL', {
    email,
  });
};
