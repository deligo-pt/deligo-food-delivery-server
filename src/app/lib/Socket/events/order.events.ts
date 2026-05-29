import { Server, Socket } from 'socket.io';
import { TAuthUser } from '../../../modules/AuthUser/authUser.interface';

export const registerOrderEvents = (io: Server, socket: Socket) => {
  const user = socket.data.user as TAuthUser;
  const userId = user?.userId;

  if (userId) {
    const personalRoom = `user_${userId}`;
    socket.join(personalRoom);
  }

  socket.on('join-order-pool', (orderId: string) => {
    if (orderId) {
      socket.join(`order_pool_${orderId}`);
    }
  });

  socket.on('disconnect', () => {});
};
