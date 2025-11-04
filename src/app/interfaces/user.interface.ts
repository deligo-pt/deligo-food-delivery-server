/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';

export interface IUserModel<T> extends Model<T> {
  isUserExistsByEmail(email: string): Promise<T | null>;
  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string
  ): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number
  ): boolean;
}
