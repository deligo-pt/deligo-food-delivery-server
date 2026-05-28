import mongoose from 'mongoose';
import { TUserRole, USER_STATUS } from '../GlobalConstant/user.constant';
import { TDeliveryAddress } from './address.interface';

export type TCurrentUser = {
  _id: mongoose.Types.ObjectId;
  userId: string;
  name: {
    firstName: string;
    lastName: string;
  };
  password: string;
  role: TUserRole;
  status: keyof typeof USER_STATUS;
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
    geoAccuracy: number;
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
    detailedAddress?: string;
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
    detailedAddress?: string;
  };
  referralCode?: string;
};

export type TLoginDevice = {
  deviceId: string;
  deviceType: string;
  deviceName?: string;
  fcmToken?: string;
  userAgent?: string;
  ip?: string;
  isVerified: boolean;
  isLoggedIn?: boolean;
  lastLogin?: Date | null;
};
