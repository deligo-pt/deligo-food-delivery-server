import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import { catchAsync } from '../utils/catchAsync';
import { verifyToken } from '../utils/verifyJWT';
import { USER_ROLE } from '../modules/User/user.constant';
import { User } from '../modules/User/user.model';

const auth = (...requiredRoles: (keyof typeof USER_ROLE)[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization;

    // checking if the token is missing
    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!1');
    }

    const decoded = verifyToken(
      token,
      config.jwt_access_secret as string
    ) as JwtPayload;

    const { role, email, iat } = decoded;

    // checking if the user is exist
    const user = await User.isUserExistsByEmail(email);

    if (!user) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!2');
    }
    // checking if the user is already deleted

    const status = user?.status;

    if (status === 'BLOCKED') {
      throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked!');
    } else if (status === 'PENDING' && user?.role === 'ADMIN') {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'This admin is not active yet !'
      );
    }

    if (
      user.passwordChangedAt &&
      User.isJWTIssuedBeforePasswordChanged(
        user.passwordChangedAt,
        iat as number
      )
    ) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!3');
    }

    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!4');
    }

    req.user = decoded as JwtPayload;
    next();
  });
};

export default auth;
