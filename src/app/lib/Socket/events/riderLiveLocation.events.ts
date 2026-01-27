/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../../../constant/user.constant';
import { DeliveryPartnerServices } from '../../../modules/Delivery-Partner/delivery-partner.service';

type LiveLocationPayload = {
  orderId: string;
  latitude: number;
  longitude: number;
  geoAccuracy?: number;
};

const lastDbUpdateMap = new Map<string, number>();
export const registerDriverLiveLocationEvents = (
  io: Server,
  socket: Socket,
) => {
  const user = socket.data.user as AuthUser;
  const userId = user?.userId;
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
        const { orderId, latitude, longitude, geoAccuracy = 0 } = payload;

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
        if (geoAccuracy > 100) return;

        // Broadcast to order room
        socket.to(orderId).emit('delivery-location-live', {
          orderId,
          latitude,
          longitude,
          geoAccuracy,
          time: new Date(),
        });

        const now = Date.now();
        const lastUpdate = lastDbUpdateMap.get(userId) || 0;
        if (now - lastUpdate > 5000) {
          lastDbUpdateMap.set(userId, now);
          DeliveryPartnerServices.updateDeliveryPartnerLiveLocation(
            { latitude, longitude, geoAccuracy },
            user,
          ).catch((err) => {
            console.error('Failed to update live location:', err);
          });
        }
      } catch {
        console.error('Error processing live location update');
      }
    },
  );
};
