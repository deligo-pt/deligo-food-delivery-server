// User Roles constant
export const USER_ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
  AGENT: 'AGENT',
  VENDOR: 'VENDOR',
  DELIVERY_PARTNER: 'DELIVERY_PARTNER',
} as const;

// User Status constant
export const USER_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
} as const;

// Searchable fields for User
export const UserSearchableFields = [
  'name',
  'email',
  'phone',
  'role',
  'status',
];

export const UrlPath = {
  CUSTOMER: '/create-customer',
  AGENT: '/create-agent',
  VENDOR: '/create-vendor',
  DELIVERY_PARTNER: '/create-delivery-partner',
  ADMIN: '/create-admin',
} as const;
