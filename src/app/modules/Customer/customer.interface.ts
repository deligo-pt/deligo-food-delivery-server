import mongoose from 'mongoose';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { TLoginDevice } from '../../constant/GlobalInterface/user.interface';
import { AddressType } from './customer.constant';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/location.interface';

export type TCustomer = {
  // ------------------------------------------------------
  // Core Identifiers
  // ------------------------------------------------------
  _id?: string;
  userId: string;
  role: 'CUSTOMER';
  email?: string;

  status: keyof typeof USER_STATUS;
  isDeleted: boolean;

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
    detailedAddress?: string;
  };

  NIF?: string;

  // ------------------------------------------------------
  // Current/Real-Time Location Data (For live tracking during delivery)
  // ------------------------------------------------------
  currentSessionLocation?: TGeoJSONPoint;

  // ------------------------------------------------------
  // Multiple Saved Delivery Addresses (Includes Zone Integration)
  // ------------------------------------------------------
  deliveryAddresses?: Array<{
    _id?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    longitude?: number;
    latitude?: number;
    geoAccuracy?: number;
    detailedAddress?: string;
    isActive: boolean;

    // Zone Integration & Metadata
    zoneId?: mongoose.Types.ObjectId; // CRITICAL: Links address to a defined delivery zone
    addressType?: keyof typeof AddressType; // e.g., 'Home', 'Work'
    notes?: string; // Specific delivery instructions
  }>;

  // ------------------------------------------------------
  // Referral
  // ------------------------------------------------------
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;

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
