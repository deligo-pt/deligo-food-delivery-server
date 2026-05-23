/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';
import { TAuthUser } from '../modules/AuthUser/authUser.interface';

export interface IAuthLookupModel<T> extends Model<T> {
  isUserExistsByEmail(
    email: string,
    isDeleted?: boolean,
    fields?: string,
  ): Promise<T | null>;
  isUserExistsByUserId(
    userCustomId: string,
    isDeleted?: boolean,
  ): Promise<T | null>;
  isUserExistsByContactNumber?(
    contactNumber: string,
    isDeleted?: boolean,
  ): Promise<T | null>;
}

export interface IAuthUserModel extends Model<TAuthUser> {
  isUserExistsByEmail(
    email: string,
    isDeleted?: boolean,
    fields?: string,
  ): Promise<TAuthUser | null>;
  isUserExistsByUserId(
    userCustomId: string,
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
