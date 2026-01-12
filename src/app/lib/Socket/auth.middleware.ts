/* eslint-disable no-unused-vars */
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import config from '../../config';
import { AuthUser } from '../../constant/user.constant';

export const socketAuthMiddleware = (
  socket: Socket,
  next: (error?: Error) => void
) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(
        new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!')
      );
    }

    const decoded = jwt.verify(
      token,
      config.jwt.jwt_access_secret as string
    ) as AuthUser;

    socket.data.user = decoded;
    next();
  } catch {
    next(new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!'));
  }
};
