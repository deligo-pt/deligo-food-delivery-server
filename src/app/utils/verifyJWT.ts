/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import AppError from '../errors/AppError';
import { TUserRole, USER_STATUS } from '../constant/user.constant';

export const createToken = (
  jwtPayload: {
    userId: string;
    name?: {
      firstName: string;
      lastName: string;
    };
    email: string;
    contactNumber?: string;
    role: TUserRole;
    status: keyof typeof USER_STATUS;
  },
  secret: string,
  expiresIn: string
) => {
  return jwt.sign(jwtPayload, secret, {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  });
};

export const verifyToken = (
  token: string,
  secret: string
): JwtPayload | Error => {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error: any) {
    throw new AppError(401, 'You are not authorized!4');
  }
};
