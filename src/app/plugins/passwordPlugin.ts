/* eslint-disable @typescript-eslint/no-explicit-any */

import { Schema } from 'mongoose';
import bcryptjs from 'bcryptjs';
import config from '../config';
import crypto from 'crypto';

export const passwordPlugin = <T extends Record<string, any>>(
  schema: Schema<T>,
): void => {
  // Pre-save Hook: Hash password before saving
  schema.pre('save', async function (next) {
    const user = this as any;
    if (user.password && user.isModified('password')) {
      user.password = await bcryptjs.hash(
        user.password,
        Number(config.bcrypt_salt_rounds),
      );
    }
    next();
  });

  // Response Security (FIXED): Use transformation instead of modifying doc memory directly
  schema.set('toJSON', {
    transform: function (doc, ret) {
      delete ret.password;
      return ret;
    },
  });
  schema.set('toObject', {
    transform: function (doc, ret) {
      delete ret.password;
      return ret;
    },
  });

  // Static: Compare password
  schema.statics.isPasswordMatched = async function (
    plainTextPassword: string,
    hashedPassword: string,
  ) {
    return await bcryptjs.compare(plainTextPassword, hashedPassword);
  };

  // Static: Check if JWT was issued before password was changed
  schema.statics.isJWTIssuedBeforePasswordChanged = function (
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number,
  ) {
    if (!passwordChangedTimestamp) return false;
    const passwordChangedTime =
      new Date(passwordChangedTimestamp).getTime() / 1000;
    return passwordChangedTime > jwtIssuedTimestamp;
  };

  // create password reset token
  // schema.methods.createPasswordResetToken = async function () {
  //   const resetToken = crypto.randomBytes(32).toString('hex');
  //   this.passwordResetToken = crypto
  //     .createHash('sha256')
  //     .update(resetToken)
  //     .digest('hex');
  //   this.passwordResetTokenExpiresAt = Date.now() + 10 * 60 * 1000;
  //   return resetToken;
  // };
  schema.methods.createPasswordResetToken = async function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    return resetToken;
  };
};
