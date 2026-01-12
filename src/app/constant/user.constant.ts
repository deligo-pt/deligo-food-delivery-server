import mongoose, { Schema } from 'mongoose';
import { TDeliveryAddress } from './address.constant';

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
  userId: string;
  moloniCustomerId?: number;
  name: {
    firstName: string;
    lastName: string;
  };
  password: string;
  role: TUserRole;
  status: keyof typeof USER_STATUS;
  fcmTokens?: string[];
  profilePhoto?: string;
  mobileOtpId?: string;
  contactNumber: string;
  email: string;
  pendingContactNumber?: string;
  otp?: string;
  isOtpExpired?: Date;
  pendingEmail?: string;
  currentSessionLocation?: {
    type: 'Point';
    coordinates: [number, number];
    accuracy: number;
    lastLocationUpdate: Date;
  };
  businessDetails?: {
    businessName: string;
    businessType: string;
    isStoreOpen: boolean;
    storeClosedAt?: Date;
  };
  deliveryAddresses?: TDeliveryAddress[];
  businessLocation?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    longitude?: number;
    latitude?: number;
    geoAccuracy?: number;
  };
  operationalData: {
    currentOrderId?: string;
  };
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    longitude?: number;
    latitude?: number;
    geoAccuracy?: number;
  };
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
