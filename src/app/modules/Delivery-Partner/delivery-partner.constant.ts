export const currentStatusOptions = {
  IDLE: 'IDLE',
  OFFLINE: 'OFFLINE',
  ON_DELIVERY: 'ON_DELIVERY',
} as const;

export const DeliveryPartnerSearchableFields = [
  'status',
  'name.firstName',
  'name.lastName',
  'email',
  'phoneNumber',
  'address.city',
  'address.state',
  'address.postalCode',
];
