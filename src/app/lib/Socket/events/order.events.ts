import { Server, Socket } from 'socket.io';
import { TCurrentUser } from '../../../constant/GlobalInterface/user.interface';

export const registerOrderEvents = (io: Server, socket: Socket) => {
  const user = socket.data.user as TCurrentUser;
  const userCustomId = user?.userCustomId;

  if (userCustomId) {
    const personalRoom = `user_${userCustomId}`;
    socket.join(personalRoom);
  }

  socket.on('join-order-pool', (orderId: string) => {
    if (orderId) {
      socket.join(`order_pool_${orderId}`);
    }
  });

  socket.on('disconnect', () => {});
};
