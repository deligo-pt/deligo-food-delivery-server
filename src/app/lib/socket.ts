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

    // Authentication Middleware
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(
          new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!')
        );
      }

      try {
        const decoded = jwt.verify(
          token,
          config.jwt_access_secret as string
        ) as AuthUser;
        socket.data.user = decoded;
        const userId = decoded.id;
        const role = decoded.role;

        if (userId) {
          socket.join(`user_${userId}`);

          if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            socket.join('admins_room');
            console.log(
              `Admin ${userId} joined the broadcast room: admins_room`
            );
          }
        }
        next();
      } catch (err) {
        return next(
          new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!')
        );
      }
    });

    io.on('connection', (socket) => {
      const user = socket.data.user as AuthUser;
      const userId = user.id;

      socket.on('join-support-chat', () => {
        const supportRoom = `support_chat_${userId}`;
        socket.join(supportRoom);

        console.log(
          `Vendor ${userId} joined Support Chat Room: ${supportRoom}`
        );

        socket.emit('support-message', {
          _id: 'system_welcome',
          message: 'Welcome to Deligo support! An admin will respond shortly.',
          senderId: 'system',
          senderRole: 'SYSTEM',
          createdAt: new Date(),
        });
      });

      socket.on('join-support-chat-as-admin', ({ userId: vendorId }) => {
        const supportRoom = `support_chat_${vendorId}`;
        socket.join(supportRoom);
        console.log(`Admin ${userId} is now monitoring: ${supportRoom}`);
      });

      socket.on('message', (data) => {
        const senderId = user.id;
        const role = user.role;

        if (role === 'VENDOR') {
          const supportRoom = `support_chat_${senderId}`;
          const messagePayload = {
            _id: new Date().getTime().toString(),
            message: data.text,
            senderId: senderId,
            senderRole: role,
            createdAt: new Date(),
          };

          io.to(supportRoom).emit('support-message', messagePayload);

          io.to('admins_room').emit('support-message', messagePayload);

          console.log(
            `Message from Vendor ${senderId} broadcasted to all admins.`
          );
        } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
          const targetVendorId = data.receiverId;
          if (!targetVendorId) return;

          const supportRoom = `support_chat_${targetVendorId}`;
          const messagePayload = {
            _id: new Date().getTime().toString(),
            message: data.text,
            senderId: senderId,
            senderRole: role,
            createdAt: new Date(),
          };

          io.to(supportRoom).emit('support-message', messagePayload);

          console.log(`Admin ${senderId} replied to Vendor ${targetVendorId}`);
        }
      });

      socket.on('leave-support-chat', () => {
        const supportRoom = `support_chat_${userId}`;
        socket.leave(supportRoom);
        console.log(`User ${userId} left Support Chat`);
      });

      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);
      });
    });
  } catch (err) {
    console.error('Failed to initialize Socket.IO:', err);
    process.exit(1);
  }
};

export const getIO = () => {
  if (!io) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Socket.io not initialized yet!'
    );
  }
  return io;
};
