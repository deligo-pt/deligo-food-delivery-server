/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';
import { Admin } from '../modules/Admin/admin.model';
import { Vendor } from '../modules/Vendor/vendor.model';
import { FleetManager } from '../modules/Fleet-Manager/fleet-manager.model';
import { DeliveryPartner } from '../modules/Delivery-Partner/delivery-partner.model';
import { Customer } from '../modules/Customer/customer.model';

export interface IUserModel<T> extends Model<T> {
  isUserExistsByEmail(
    email: string,
    isDeleted?: boolean,
    fields?: string,
  ): Promise<T | null>;
  isUserExistsByUserId(
    customUserId: string,
    isDeleted?: boolean,
  ): Promise<T | null>;
  isUserExistsByContactNumber(
    contactNumber: string,
    isDeleted?: boolean,
  ): Promise<T | null>;
  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number,
  ): boolean;
  createPasswordResetToken(): string;
}

export const ALL_USER_MODELS = [
  Admin,
  Vendor,
  FleetManager,
  DeliveryPartner,
  Customer,
] as IUserModel<any>[];
