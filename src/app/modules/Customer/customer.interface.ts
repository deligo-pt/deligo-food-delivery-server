import { TLoginDevice, USER_STATUS } from '../../constant/user.constant';

export type TCustomer = {
  // ------------------------------------------------------
  // Core Identifiers
  // ------------------------------------------------------
  _id?: string;
  userId: string;
  role: 'CUSTOMER';
  email: string;
  password?: string;

  status: keyof typeof USER_STATUS;
  isOtpVerified: boolean;
  isDeleted: boolean;

  // Push notifications
  fcmTokens?: string[];

  // ------------------------------------------------------
  // OTP & Password Reset
  // ------------------------------------------------------
  otp?: string;
  isOtpExpired?: Date;
  requiresOtpVerification?: boolean;

  passwordResetToken?: string;
  passwordResetTokenExpiresAt?: Date;
  passwordChangedAt?: Date;

  // ------------------------------------------------------
  // Personal Information
  // ------------------------------------------------------
  name?: {
    firstName?: string;
    lastName?: string;
  };

  contactNumber?: string;
  profilePhoto?: string;

  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    geoAccuracy?: number;
  };

  // Multiple Saved Delivery Addresses
  deliveryAddresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    geoAccuracy?: number;
    isActive: boolean;
  }>;

  // ------------------------------------------------------
  // Orders & Activity
  // ------------------------------------------------------
  orders: {
    totalOrders?: number;
    totalSpent?: number;
    lastOrderDate?: Date;
    lastLoginAt?: Date;
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
  approvedBy?: string;
  rejectedBy?: string;
  blockedBy?: string;
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
