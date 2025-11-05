// User Roles constant
export const USER_ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
  FLEET_MANAGER: 'FLEET_MANAGER',
  VENDOR: 'VENDOR',
  DELIVERY_PARTNER: 'DELIVERY_PARTNER',
} as const;

// User Status constant
export const USER_STATUS = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const UrlPath = {
  CUSTOMER: '/register/create-customer',
  FLEET_MANAGER: '/register/create-fleet-manager',
  VENDOR: '/register/create-vendor',
  DELIVERY_PARTNER: '/register/create-delivery-partner',
  ADMIN: '/register/create-admin',
} as const;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  mobileNumber: string;
  role: keyof typeof USER_ROLE;
  status: keyof typeof USER_STATUS;
  iat: number;
  exp: number;
};
