/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../../../constant/user.constant';

type LiveLocationPayload = {
  orderId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export const registerDriverLiveLocationEvents = (
  io: Server,
  socket: Socket
) => {
  const user = socket.data.user as AuthUser;
  const userId = user?.id;
  const userRole = user?.role;

  // --------------------------------------------
  //  Join order live tracking room
  // --------------------------------------------
  socket.on('join-order-tracking', ({ orderId }: { orderId: string }) => {
    if (!orderId) return;

    // Optional role-based restriction
    if (
      userRole !== 'CUSTOMER' &&
      userRole !== 'ADMIN' &&
      userRole !== 'SUPER_ADMIN' &&
      userRole !== 'DELIVERY_PARTNER'
    ) {
      return;
    }

    socket.join(orderId);
  });

  // --------------------------------------------
  //  Delivery Partner live location update
  // --------------------------------------------
  socket.on(
    'delivery-location-update',
    async (payload: LiveLocationPayload) => {
      try {
        const { orderId, latitude, longitude, accuracy = 0 } = payload;

        if (!orderId || !userId) return;

        // Only delivery partner can send location
        if (userRole !== 'DELIVERY_PARTNER') return;

        // GPS validation
        if (
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return;
        }

        // Ignore weak / fake GPS
        if (accuracy > 100) return;

        // Broadcast to order room
        socket.to(orderId).emit('delivery-location-live', {
          orderId,
          latitude,
          longitude,
          accuracy,
          time: new Date(),
        });
      } catch {
        // silent fail – location stream must never crash socket
      }
    }
  );
};
