/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { ALL_USER_MODELS } from '../modules/Auth/auth.constant';
import {
  ROLE_COLLECTION_MAP,
  ROLE_PREFIX_MAP,
  TUserRole,
} from '../constant/GlobalConstant/user.constant';
import { IUserModel } from '../interfaces/user.interface';
import { Admin } from '../modules/Admin/admin.model';
import { Customer } from '../modules/Customer/customer.model';
import { FleetManager } from '../modules/Fleet-Manager/fleet-manager.model';
import { Vendor } from '../modules/Vendor/vendor.model';
import { DeliveryPartner } from '../modules/Delivery-Partner/delivery-partner.model';
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
    throw new AppError(httpStatus.BAD_REQUEST, 'User id must be provided');
  }

  const existingUser = await AuthUser.findOne({ userId });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const role = existingUser?.role;

  if (role) {
    const modelName = ROLE_COLLECTION_MAP[role as TUserRole];
    const Model = mongoose.model(modelName) as IUserModel<any>;

    if (!Model) {
      throw new AppError(httpStatus.UNAUTHORIZED, `Unauthorized role: ${role}`);
    }

    const foundUser = await Model.isUserExistsByUserId(userId, isDeleted);
    if (foundUser) {
      return { user: foundUser, model: Model };
    }
  }
  throw new AppError(
    httpStatus.NOT_FOUND,
    `No user found with ID "${userId}".`,
  );
};

export const findUserByEmail = async ({
  email,
  isDeleted = false,
}: {
  email: string;
  isDeleted?: boolean;
}) => {
  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email must be provided');
  }
  const existingUser = await AuthUser.findOne({ email });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const role = existingUser?.role;

  if (role) {
    const modelName = ROLE_COLLECTION_MAP[role as TUserRole];
    const Model = mongoose.model(modelName) as IUserModel<any>;

    if (!Model) {
      throw new AppError(httpStatus.UNAUTHORIZED, `Unauthorized role: ${role}`);
    }

    const foundUser = await Model.isUserExistsByEmail(email, isDeleted);
    if (foundUser) {
      return { user: foundUser, model: Model };
    }
  }
  throw new AppError(
    httpStatus.NOT_FOUND,
    `No user found with email "${email}".`,
  );
};
