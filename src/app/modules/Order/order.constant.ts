export const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  AWAITING_PARTNER: 'AWAITING_PARTNER',
  DISPATCHING: 'DISPATCHING',
  ASSIGNED: 'ASSIGNED',
  REASSIGNMENT_NEEDED: 'REASSIGNMENT_NEEDED',
  PICKED_UP: 'PICKED_UP',
  ON_THE_WAY: 'ON_THE_WAY',
  DELIVERED: 'DELIVERED',
  CANCELED: 'CANCELED', // canceled (vendor/customer/admin)
} as const;

export const BLOCKED_FOR_ORDER_CANCEL = [
  ORDER_STATUS.ASSIGNED,
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.ON_THE_WAY,
  ORDER_STATUS.DELIVERED,
] as const;

export const DELIVERY_SEARCH_TIERS_METERS = [3000, 4000, 5000];

export const OrderSearchableFields = [
  'orderId',
  'customerId',
  'vendorId',
  'deliveryAddress.street',
  'deliveryAddress.city',
  'deliveryAddress.country',
];
