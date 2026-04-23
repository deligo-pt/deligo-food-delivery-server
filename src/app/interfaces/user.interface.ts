/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';

export interface IUserModel<T> extends Model<T> {
  isUserExistsByEmail(
    email: string,
    isDeleted?: boolean,
    fields?: string,
  ): Promise<T | null>;
  isUserExistsByUserId(customUserId: string, isDeleted?: boolean): Promise<T | null>;
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
