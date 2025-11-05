/* eslint-disable @typescript-eslint/no-explicit-any */

import { Schema } from 'mongoose';
import bcryptjs from 'bcryptjs';
import config from '../config';

export const passwordPlugin = <T extends { email: string }>(
  schema: Schema<T>
): void => {
  // Pre-save Hook: Hash password before saving
  schema.pre('save', async function (next) {
    const user = this as any;
    if (user.password && user.isModified('password')) {
      user.password = await bcryptjs.hash(
        user.password,
        Number(config.bcrypt_salt_rounds)
      );
    }
    next();
  });

  // Post-save Hook: Remove password before sending response
  schema.post('save', function (doc: any, next) {
    if (doc.password) {
      doc.password = '';
    }
    next();
  });

  // Static: Check if user exists by email
  schema.statics.isUserExistsByEmail = async function (email: string) {
    return await this.findOne({ email }).select('+password');
  };

  // Static: Compare password
  schema.statics.isPasswordMatched = async function (
    plainTextPassword: string,
    hashedPassword: string
  ) {
    return await bcryptjs.compare(plainTextPassword, hashedPassword);
  };

  // Static: Check if JWT was issued before password was changed
  schema.statics.isJWTIssuedBeforePasswordChanged = function (
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number
  ) {
    if (!passwordChangedTimestamp) return false;
    const passwordChangedTime =
      new Date(passwordChangedTimestamp).getTime() / 1000;
    return passwordChangedTime > jwtIssuedTimestamp;
  };
};
