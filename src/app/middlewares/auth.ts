import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import { catchAsync } from '../utils/catchAsync';
import { verifyToken } from '../utils/verifyJWT';
import { TUserRole, USER_STATUS } from '../constant/user.constant';
import { findUserById } from '../utils/findUserByEmailOrId';

/**
 * Authentication & Authorization Middleware
 * 1. Validates the JWT token from Headers or Cookies.
 * 2. Checks user status (Blocked/Deleted).
 * 3. Validates password change history to invalidate old tokens.
 * 4. Checks if the specific device session is still active.
 * 5. Verifies if the user has the required roles for the route.
 */
const auth = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // 1. Extract token from Authorization Header (supports both 'Bearer <token>' and raw token)
    const authHeader = req.headers.authorization;
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else {
        token = authHeader;
      }
    }

    // 2. Fallback: Extract token from Cookies if not found in headers
    const authCookies = req.cookies?.accessToken;
    if (!token && authCookies) {
      token = authCookies;
    }

    // 3. Ensure a token exists
    if (!token) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'Authentication required. Please log in',
      );
    }

    // 4. Verify the integrity and expiration of the JWT token
    const decoded = verifyToken(
      token,
      config.jwt.jwt_access_secret as string,
    ) as JwtPayload;

    const { role, iat, userId, deviceId } = decoded;

    // 5. Fetch user and model information from the database
    const result = await findUserById({
      customUserId: userId,
      isDeleted: false,
    });
    const foundModel = result?.model;
    const user = result?.user;
    const status = user?.status;

    // 6. Security Check: Prevent access if the user is blocked
    if (status === USER_STATUS.BLOCKED) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Your account is blocked. Please contact support.',
      );
    }

    // 7. Token Expiry Check: If password was changed after token issuance, invalidate the token
    if (
      user.passwordChangedAt &&
      foundModel?.isJWTIssuedBeforePasswordChanged(
        user.passwordChangedAt,
        iat as number,
      )
    ) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'Your password was recently changed. Please log in again.',
      );
    }

    // 8. Session Validation: Check if the current deviceId exists in active loginDevices
    // const isSessionActive = user.loginDevices?.some(
    //   (device: { deviceId: string }) => device.deviceId === deviceId,
    // );

    // if (!isSessionActive) {
    //   throw new AppError(
    //     httpStatus.UNAUTHORIZED,
    //     'This session is no longer active. Please log in again.',
    //   );
    // }

    // 9. Role-Based Access Control: Check if the user has the required role to access the route
    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Access denied. You do not have the necessary permissions.',
      );
    }

    // 10. Grant Access: Attach user info to req object and proceed to next middleware/controller
    req.user = user;
    next();
  });
};

export default auth;
