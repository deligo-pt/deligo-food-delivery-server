/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import AppError from '../errors/AppError';
import {
  TUserRole,
  USER_STATUS,
} from '../constant/GlobalConstant/user.constant';
import httpStatus from 'http-status';

const JWT_ALGORITHM = 'HS256' as const;

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
    deviceId?: string;
    jti?: string; // unique id per refresh-token issuance, required for rotation/reuse detection
  },
  secret: string,
  expiresIn: string,
) => {
  return jwt.sign(jwtPayload, secret, {
    expiresIn: expiresIn as SignOptions['expiresIn'],
    algorithm: JWT_ALGORITHM,
  });
};

export const verifyToken = (
  token: string,
  secret: string,
): JwtPayload | Error => {
  try {
    return jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    }) as JwtPayload;
  } catch (error: any) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'NOT_AUTHORIZED');
  }
};
