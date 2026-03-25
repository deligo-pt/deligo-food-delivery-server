import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import { catchAsync } from '../utils/catchAsync';
import { verifyToken } from '../utils/verifyJWT';
import { TUserRole, USER_STATUS } from '../constant/user.constant';
import { findUserById } from '../utils/findUserByEmailOrId';

const auth = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // authorization header
    const authHeader = req.headers.authorization;

    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else {
        token = authHeader;
      }
    }

    // cookies token
    const authCookies = req.cookies?.accessToken;

    if (!token && authCookies) {
      token = authCookies;
    }


    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorizedddddd!');
    }

    const decoded = verifyToken(
      token,
      config.jwt.jwt_access_secret as string,
    ) as JwtPayload;

    const { role, iat, userId, deviceId } = decoded;

    const result = await findUserById({ userId, isDeleted: false });

    const foundModel = result?.model;

    const user = result?.user;
    const status = user?.status;

    if (status === USER_STATUS.BLOCKED) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Your account is blocked. Please contact support.',
      );
    }

    if (
      user.passwordChangedAt &&
      foundModel?.isJWTIssuedBeforePasswordChanged(
        user.passwordChangedAt,
        iat as number,
      )
    ) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized2!');
    }

    const isSessionActive = user.loginDevices?.some(
      (device: { deviceId: string }) => device.deviceId === deviceId,
    );

    if (!isSessionActive) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'Your session has expired or you have been logged out from this device.',
      );
    }

    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized3!');
    }

    req.user = user;
    next();
  });
};

export default auth;
