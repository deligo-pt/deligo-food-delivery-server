import { Server, Socket } from 'socket.io';
import { AuthUser } from '../../../constant/user.constant';

export const registerOrderEvents = (io: Server, socket: Socket) => {
  const user = socket.data.user as AuthUser;
  const userId = user?.customUserId;

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
