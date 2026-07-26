import { Server } from 'socket.io';

export type OrderSocketPayload = {
  orderId: string;
  orderStatus: string;
  order?: Record<string, unknown>;
  customerUserId?: string | null;
  vendorUserId?: string | null;
  deliveryPartnerUserId?: string | null;
};

export const emitOrderStatusUpdate = (
  io: Server,
  payload: OrderSocketPayload,
) => {
  const rooms = [
    `order_${payload.orderId}`,
    ...(payload.customerUserId ? [`user_${payload.customerUserId}`] : []),
    ...(payload.vendorUserId ? [`user_${payload.vendorUserId}`] : []),
    ...(payload.deliveryPartnerUserId
      ? [`user_${payload.deliveryPartnerUserId}`]
      : []),
  ];

  io.to(rooms).emit('ORDER_STATUS_UPDATED', {
    orderId: payload.orderId,
    orderStatus: payload.orderStatus,
    order: payload.order,
    timestamp: new Date().toISOString(),
  });
};
