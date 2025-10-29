export const USER_ROLE = {
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
  AGENT: 'AGENT',
  VENDOR: 'VENDOR',
  DELIVERYPARTNER: 'DELIVERYPARTNER',
} as const;

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
} as const;

export const UserSearchableFields = [
  'name',
  'email',
  'phone',
  'role',
  'status',
];
