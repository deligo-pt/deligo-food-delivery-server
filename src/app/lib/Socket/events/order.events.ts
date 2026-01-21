import { Server, Socket } from 'socket.io';
import { AuthUser } from '../../../constant/user.constant';

export const registerOrderEvents = (io: Server, socket: Socket) => {
  const user = socket.data.user as AuthUser;
  const userId = user?.userId;

  if (userId) {
    const personalRoom = `user_${userId}`;
    socket.join(personalRoom);
    console.log(
      `User ${userId} joined personal notification room: ${personalRoom}`,
    );
  }

  socket.on('join-order-pool', (orderId: string) => {
    if (orderId) {
      socket.join(`order_pool_${orderId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected from order events`);
  });
};
