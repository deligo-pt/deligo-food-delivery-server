/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';
import { USER_ROLE, USER_STATUS } from './user.constant';

export type TUser = {
  __id: string;
  id: string;
  role: keyof typeof USER_ROLE;
  email: string;
  password: string;
  status: keyof typeof USER_STATUS;
  isEmailVerified: boolean;
  isDeleted: boolean;

  // OTP Details
  otp?: string;
  isOtpExpired?: Date;

  // Personal Details
  name?: string;
  mobileNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };

  deliveryAddresses?: {
    address?: string;
    isActive?: boolean;
  }[];

  profilePhoto?: string;

  passwordChangedAt?: Date;
  // timestamps
  createdAt?: Date;
  updatedAt?: Date;
};

export interface IUserModel extends Model<TUser> {
  isUserExistsByEmail(id: string): Promise<TUser>;
  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string
  ): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number
  ): boolean;
}
