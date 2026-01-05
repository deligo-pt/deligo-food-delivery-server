import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import httpStatus from 'http-status';
import { socketAuthMiddleware } from './auth.middleware';
import { registerSupportEvents } from './events/support.events';
import config from '../../config';
import AppError from '../../errors/AppError';
import { registerDriverLiveLocationEvents } from './events/riderLiveLocation.events';
import { registerSosSocketEvents } from './events/sosAlerts.events';

let io: Server;

const allowedOrigins = config.origins?.split(',') ?? [];

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked for origin: ${origin}`));
        }
      },
      credentials: true,
    },
  });

  // global socket auth
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`Socket connected: ${user?.id}`);

    registerSupportEvents(io, socket);
    registerDriverLiveLocationEvents(io, socket);
    registerSosSocketEvents(io, socket);
  });
};

export const getIO = () => {
  if (!io) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Socket not initialized'
    );
  }
  return io;
};
