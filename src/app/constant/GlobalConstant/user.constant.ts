/* eslint-disable @typescript-eslint/no-explicit-any */

// User Roles constant
export const USER_ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
  FLEET_MANAGER: 'FLEET_MANAGER',
  VENDOR: 'VENDOR',
  SUB_VENDOR: 'SUB_VENDOR',
  DELIVERY_PARTNER: 'DELIVERY_PARTNER',
} as const;

export type TUserRole = keyof typeof USER_ROLE;

export const ROLE_COLLECTION_MAP: Record<keyof typeof USER_ROLE, string> = {
  SUPER_ADMIN: 'Admin',
  ADMIN: 'Admin',
  CUSTOMER: 'Customer',
  FLEET_MANAGER: 'FleetManager',
  VENDOR: 'Vendor',
  SUB_VENDOR: 'Vendor',
  DELIVERY_PARTNER: 'DeliveryPartner',
} as const;

// User Status constant
export const USER_STATUS = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  BLOCKED: 'BLOCKED',
} as const;

export const UrlPath = {
  CUSTOMER: '/register/create-customer',
  FLEET_MANAGER: '/register/create-fleet-manager',
  VENDOR: '/register/create-vendor',
  SUB_VENDOR: '/register/create-sub-vendor',
  DELIVERY_PARTNER: '/register/create-delivery-partner',
  ADMIN: '/register/create-admin',
} as const;

export const ROLE_DEVICE_LIMITS: Record<string, number> = {
  DELIVERY_PARTNER: 1,
  SUPER_ADMIN: 5,
  ADMIN: 3,
  CUSTOMER: 3,
  FLEET_MANAGER: 3,
  VENDOR: 3,
  SUB_VENDOR: 3,
};

export const ROLE_PREFIX_MAP: Record<string, TUserRole> = {
  SA: 'ADMIN',
  A: 'ADMIN',
  V: 'VENDOR',
  SV: 'VENDOR',
  C: 'CUSTOMER',
  D: 'DELIVERY_PARTNER',
  FM: 'FLEET_MANAGER',
};
