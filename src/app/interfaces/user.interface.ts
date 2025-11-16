/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';

export interface IUserModel<T> extends Model<T> {
  isUserExistsByEmail(email: string, isDeleted?: boolean): Promise<T | null>;
  isUserExistsByUserId(userId: string, isDeleted?: boolean): Promise<T | null>;
  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string
  ): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number
  ): boolean;
  createPasswordResetToken(): string;
}
