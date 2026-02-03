/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { ALL_USER_MODELS } from '../modules/Auth/auth.constant';
import { ROLE_PREFIX_MAP, TUserRole } from '../constant/user.constant';
import { IUserModel } from '../interfaces/user.interface';
import { Admin } from '../modules/Admin/admin.model';
import { Customer } from '../modules/Customer/customer.model';
import { FleetManager } from '../modules/Fleet-Manager/fleet-manager.model';
import { Vendor } from '../modules/Vendor/vendor.model';
import { DeliveryPartner } from '../modules/Delivery-Partner/delivery-partner.model';

export const findUserById = async ({
  userId,
  isDeleted = false,
}: {
  userId: string;
  isDeleted?: boolean;
}) => {
  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User ID must be provided');
  }
  const prefix = userId.split('-')[0].toUpperCase();
  const role = ROLE_PREFIX_MAP[prefix];
  const ROLE_MODEL_MAP: Record<TUserRole, IUserModel<any>> = {
    SUPER_ADMIN: Admin,
    ADMIN: Admin,
    CUSTOMER: Customer,
    FLEET_MANAGER: FleetManager,
    VENDOR: Vendor,
    SUB_VENDOR: Vendor,
    DELIVERY_PARTNER: DeliveryPartner,
  };

  if (role) {
    const Model = ROLE_MODEL_MAP[role as TUserRole] as IUserModel<any>;

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
  for (const Model of ALL_USER_MODELS) {
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
