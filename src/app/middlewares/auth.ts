import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import { catchAsync } from '../utils/catchAsync';
import { verifyToken } from '../utils/verifyJWT';
import { TUserRole, USER_STATUS } from '../constant/user.constant';
import { findUserByEmailOrId } from '../utils/findUserByEmailOrId';

const auth = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization;

    // checking if the token is missing
    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }

    const decoded = verifyToken(
      token,
      config.jwt_access_secret as string
    ) as JwtPayload;

    const { role, iat, id } = decoded;

    const result = await findUserByEmailOrId({ userId: id, isDeleted: false });

    const foundModel = result?.model;

    const user = result?.user;
    const status = user?.status;

    if (status === USER_STATUS.BLOCKED) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Your account is blocked. Please contact support.'
      );
    }

    if (
      user.passwordChangedAt &&
      foundModel?.isJWTIssuedBeforePasswordChanged(
        user.passwordChangedAt,
        iat as number
      )
    ) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }

    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }

    req.user = user as JwtPayload;
    next();
  });
};

export default auth;
