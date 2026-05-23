/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server, Socket } from 'socket.io';
import { SosModel } from '../../../modules/Sos/sos.model';
import { TCurrentUser } from '../../../constant/GlobalInterface/user.interface';

const sosLastDbUpdateMap = new Map<string, number>();

export const registerSosSocketEvents = (io: Server, socket: Socket) => {
  const user = socket.data.user as TCurrentUser;
  const userCustomId = user?.userCustomId;
  const userRole = user?.role;

  // --------------------------------------------
  // Join SOS Admin Room
  // --------------------------------------------
  socket.on('join-sos-monitoring', () => {
    if (['ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'].includes(userRole)) {
      socket.join('SOS_ALERTS_POOL');
    }
  });

  // --------------------------------------------
  // SOS Live Location Stream
  // --------------------------------------------
  socket.on(
    'sos-location-stream',
    async (payload: {
      sosId: string;
      latitude: number;
      longitude: number;
      geoAccuracy?: number;
    }) => {
      try {
        const { sosId, latitude, longitude, geoAccuracy = 0 } = payload;

        if (!sosId || !userCustomId) return;

        if (
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        )
          return;
        if (geoAccuracy > 100) return;

        io.to('SOS_ALERTS_POOL').emit(`sos-live-location-${sosId}`, {
          sosId,
          latitude,
          longitude,
          geoAccuracy,
          updatedAt: new Date(),
        });

        const now = Date.now();
        const lastUpdate = sosLastDbUpdateMap.get(sosId) || 0;

        if (now - lastUpdate > 3000) {
          sosLastDbUpdateMap.set(sosId, now);

          await SosModel.findByIdAndUpdate(sosId, {
            location: { type: 'Point', coordinates: [longitude, latitude] },
          });
        }
      } catch (error) {
        console.error('SOS Live Stream Error:', error);
      }
    },
  );
};
