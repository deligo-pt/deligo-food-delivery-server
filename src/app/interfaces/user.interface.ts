/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';
import { TAuthUser } from '../modules/AuthUser/authUser.interface';

export interface IAuthUserMethods {
  createPasswordResetToken(): Promise<string>;
}

export interface IAuthUserModel extends Model<TAuthUser, {}, IAuthUserMethods> {
  isUserExistsByEmail(
    email: string,
    isDeleted?: boolean,
    fields?: string,
  ): Promise<TAuthUser | null>;
  isUserExistsByUserId(
    userId: string,
    isDeleted?: boolean,
  ): Promise<TAuthUser | null>;
  isUserExistsByContactNumber(
    contactNumber: string,
    isDeleted?: boolean,
  ): Promise<TAuthUser | null>;

  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number,
  ): boolean;
}
