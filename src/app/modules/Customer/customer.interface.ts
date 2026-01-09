import mongoose from 'mongoose';
import { TLoginDevice, USER_STATUS } from '../../constant/user.constant';
import { AddressType } from './customer.constant';

export type TCustomer = {
  // ------------------------------------------------------
  // Core Identifiers
  // ------------------------------------------------------
  _id?: string;
  userId: string;
  moloniCustomerId: string;
  role: 'CUSTOMER';
  email?: string;

  status: keyof typeof USER_STATUS;
  isOtpVerified: boolean;
  isDeleted: boolean;

  // Push notifications
  fcmTokens?: string[];

  // --------------------------------------------------------
  // Pending temporary Email and contact number
  // --------------------------------------------------------
  pendingEmail?: string;
  pendingContactNumber?: string;

  // ------------------------------------------------------
  // OTP
  // ------------------------------------------------------
  otp?: string;
  isOtpExpired?: Date;
  requiresOtpVerification?: boolean;
  mobileOtpId?: string;

  // ------------------------------------------------------
  // Personal Information
  // ------------------------------------------------------
  name?: {
    firstName?: string;
    lastName?: string;
  };

  contactNumber?: string;
  profilePhoto?: string;

  // Primary/Billing Address (Can be simple)
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    longitude?: number;
    latitude?: number;
    geoAccuracy?: number;
  };

  NIF?: string;

  // Operational Address
  operationalAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    longitude?: number;
    latitude?: number;
    geoAccuracy?: number;
  };

  // ------------------------------------------------------
  // Current/Real-Time Location Data (For live tracking during delivery)
  // ------------------------------------------------------
  currentSessionLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    accuracy?: number; // GPS Accuracy in meters
    lastLocationUpdate: Date; // Timestamp for data freshness
  };

  // ------------------------------------------------------
  // Multiple Saved Delivery Addresses (Includes Zone Integration)
  // ------------------------------------------------------
  deliveryAddresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    longitude?: number;
    latitude?: number;
    geoAccuracy?: number;
    isActive: boolean;

    // Zone Integration & Metadata
    zoneId?: mongoose.Types.ObjectId; // CRITICAL: Links address to a defined delivery zone
    addressType?: keyof typeof AddressType; // e.g., 'Home', 'Work'
    notes?: string; // Specific delivery instructions
  }>;

  // ------------------------------------------------------
  // Orders & Activity (Includes Analytics Metrics)
  // ------------------------------------------------------
  orders: {
    totalOrders?: number;
    totalSpent?: number;
    lastOrderDate?: Date;
    lastLoginAt?: Date;

    // Analytics
    avgOrderValue?: number;
    referralsCount?: number;
  };

  // ------------------------------------------------------
  // Security & Access
  // ------------------------------------------------------
  twoFactorEnabled?: boolean;
  loginDevices?: TLoginDevice[];

  // ------------------------------------------------------
  // Referral & Loyalty
  // ------------------------------------------------------
  referralCode?: string;
  loyaltyPoints?: number;

  // ------------------------------------------------------
  // Admin Workflow / Audit
  // ------------------------------------------------------
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  blockedBy?: mongoose.Types.ObjectId;
  approvedOrRejectedOrBlockedAt?: Date;
  remarks?: string;

  // ------------------------------------------------------
  // Payment Methods
  // ------------------------------------------------------
  paymentMethods?: Array<{
    cardType: string;
    lastFourDigits: string;
    expiryDate: string;
    isDefault: boolean;
  }>;

  // ------------------------------------------------------
  // Timestamps
  // ------------------------------------------------------
  createdAt?: Date;
  updatedAt?: Date;
};
