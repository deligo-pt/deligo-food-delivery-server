import mongoose, { Schema } from 'mongoose';

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

export type AuthUser = {
  _id: mongoose.Types.ObjectId;
  id: string;
  name: string;
  role: TUserRole;
  status: keyof typeof USER_STATUS;
  currentSessionLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  address?: string;
  iat: number;
  exp: number;
};

export type TLoginDevice = {
  deviceId: string;
  deviceName?: string;
  userAgent?: string;
  ip?: string;
  isVerified: boolean;
  lastLogin?: Date | null;
};

export const loginDeviceSchema = new Schema(
  {
    deviceId: {
      type: String,
      required: true,
    },
    deviceName: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    ip: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);
