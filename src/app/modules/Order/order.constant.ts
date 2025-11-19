export const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  ON_THE_WAY: 'ON_THE_WAY',
  DELIVERED: 'DELIVERED',
  CANCELED: 'CANCELED', // canceled (vendor/customer/admin)
} as const;

export const OrderSearchableFields = [
  'orderId',
  'customerId',
  'vendorId',
  'deliveryAddress.street',
  'deliveryAddress.city',
  'deliveryAddress.country',
];
