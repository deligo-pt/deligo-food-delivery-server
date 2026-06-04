/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import { catchAsync } from '../utils/catchAsync';
import { verifyToken } from '../utils/verifyJWT';
import {
  TUserRole,
  USER_ROLE,
  USER_STATUS,
} from '../constant/GlobalConstant/user.constant';
import { AuthUser } from '../modules/AuthUser/authUser.model';

/**
 * Authentication & Authorization Middleware
 */
const auth = (...requiredRoles: TUserRole[]) => {
  return (requiredPermission?: string) => {
    return catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        let token: string | undefined;

        // 1. Extract token from Authorization Header
        const authHeader = req.headers.authorization;
        if (authHeader) {
          if (authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
          } else {
            token = authHeader;
          }
        }

        // 2. Fallback: Extract token from Cookies
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
        const user = await AuthUser.findOne({ userId }).populate('permissions');
        if (!user) {
          throw new AppError(httpStatus.UNAUTHORIZED, 'User not found');
        }

        if (user.isDeleted) {
          throw new AppError(
            httpStatus.UNAUTHORIZED,
            'Your account is deleted. Please contact support.',
          );
        }

        if (user.role === 'CUSTOMER' && user.requiresOtpVerification) {
          throw new AppError(
            httpStatus.UNAUTHORIZED,
            'Please verify your email or phone number first.',
          );
        }

        const status = user?.status;

        // 6. Security Check: Prevent access if the user is blocked
        if (status === USER_STATUS.BLOCKED) {
          throw new AppError(
            httpStatus.FORBIDDEN,
            'Your account is blocked. Please contact support.',
          );
        }

        //7. Session Validation (Fixed TypeScript Error & Removed Duplication 🚀)
        const currentDeviceSession = user.loginDevices?.find(
          (device: any) => device.deviceId === deviceId,
        );

        if (
          !currentDeviceSession ||
          currentDeviceSession.isLoggedIn === false
        ) {
          throw new AppError(
            httpStatus.UNAUTHORIZED,
            'You have been logged out from this device. Please log in again.',
          );
        }

        // 8. Token Expiry Check: If password was changed after token issuance
        if (user.passwordChangedAt) {
          const passwordChangedTime = Math.floor(
            new Date(user.passwordChangedAt).getTime() / 1000,
          );
          if (passwordChangedTime > (iat as number)) {
            throw new AppError(
              httpStatus.UNAUTHORIZED,
              'Your password was recently changed. Please log in again.',
            );
          }
        }

        // 9. Role-Based Access Control
        if (requiredRoles.length && !requiredRoles.includes(role)) {
          throw new AppError(
            httpStatus.FORBIDDEN,
            'Access denied. You do not have the necessary permissions.',
          );
        }

        if (requiredPermission) {
          const bypassRoles = [
            USER_ROLE.SUPER_ADMIN,
            USER_ROLE.CUSTOMER,
            USER_ROLE.VENDOR,
            USER_ROLE.SUB_VENDOR,
            USER_ROLE.DELIVERY_PARTNER,
            USER_ROLE.FLEET_MANAGER,
          ];
          if (!bypassRoles.includes(role)) {
            const userPermissionNames = (user.permissions as any[]).map((p) =>
              p?.name?.toUpperCase(),
            );

            const hasPermission = userPermissionNames.includes(
              requiredPermission.toUpperCase(),
            );

            if (!hasPermission) {
              throw new AppError(
                httpStatus.FORBIDDEN,
                `Forbidden: You lack the specific permission '${requiredPermission}' to perform this action!`,
              );
            }
          }
        }

        req.user = user;
        next();
      },
    );
  };
};

export default auth;
