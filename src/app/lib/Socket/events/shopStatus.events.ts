/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server, Socket } from 'socket.io';
import { TCurrentUser } from '../../../constant/GlobalInterface/user.interface';

type VendorStoreStatusPayload = {
  vendorId: string;
  isOpen: boolean;
  isManualControl?: boolean;
  storeClosedAt?: Date | null;
  updatedAt?: Date;
  source?: 'toggle' | 'cron' | 'manual';
};

const getVendorRoomName = (vendorId: string) =>
  `vendor-store-status:${vendorId}`;
const customerUpdatesRoom = 'vendor-store-status-customers';

export const registerShopStatusEvents = (io: Server, socket: Socket) => {
  const user = socket.data.user as TCurrentUser | undefined;
  const userRole = user?.role;
  const isCustomer = userRole === 'CUSTOMER';
  const isVendor = userRole === 'VENDOR' || userRole === 'SUB_VENDOR';

  socket.on(
    'join-vendor-store-status-room',
    ({ vendorId }: { vendorId?: string }) => {
      if ((!isCustomer && !isVendor) || !vendorId) return;
      if (isVendor && user?.userId !== vendorId) return;
      socket.join(getVendorRoomName(vendorId));
    },
  );

  socket.on(
    'leave-vendor-store-status-room',
    ({ vendorId }: { vendorId?: string }) => {
      if ((!isCustomer && !isVendor) || !vendorId) return;
      socket.leave(getVendorRoomName(vendorId));
    },
  );

  if (isCustomer) {
    socket.join(customerUpdatesRoom);
  }
};

export const emitVendorStoreStatusUpdate = (
  io: Server,
  payload: VendorStoreStatusPayload,
) => {
  const roomName = getVendorRoomName(payload.vendorId);
  io.to(roomName).emit('vendor-store-status-updated', payload);
  io.to(customerUpdatesRoom).emit('vendor-store-status-updated', payload);
};
