import { JwtPayload } from 'jsonwebtoken';
import { Server } from 'socket.io';

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
  // eslint-disable-next-line no-var
  var io: Server;
}

export {};
