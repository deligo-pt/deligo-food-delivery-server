/* eslint-disable no-console */
import { Server as SocketServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import { AuthUser } from '../constant/user.constant';

let io: SocketServer;

const allowedOrigins = config.origins?.split(',') ?? [];

export const initializeSocket = async (httpServer: HTTPServer) => {
  try {
    // Initialize Socket.IO
    io = new SocketServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
      },
    });

    // Middleware to authenticate socket connection
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(
          new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!')
        );
      }

      try {
        // Verify token
        const decoded = jwt.verify(token, config.jwt_access_secret as string);

        // Attach user to socket
        socket.data.user = decoded;

        const userId = (decoded as AuthUser).id;

        if (userId) {
          socket.join(`user_${userId}`);
          console.log(`User joined room: user_${userId}`);
        }

        next();
      } catch (err) {
        return next(
          new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!')
        );
      }
    });

    io.on('connection', (socket) => {
      console.log('Socket connected', socket.data.user.id);

      socket.on('message', (data) => {
        console.log('Message event:', data);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected', socket.id);
      });
    });
  } catch (err) {
    console.error('Failed to initialize Socket.IO:', err);
    process.exit(1);
  }
};

// export io to use in other files
export const getIO = () => {
  if (!io) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Socket.io not initialized yet!'
    );
  }
  return io;
};
