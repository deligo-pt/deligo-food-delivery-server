export const currentStatusOptions = {
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
  ON_DELIVERY: 'ON_DELIVERY',
} as const;

export const DeliveryPartnerSearchableFields = [
  'status',
  'name',
  'email',
  'phoneNumber',
  'address.city',
  'address.state',
  'address.postalCode',
];
