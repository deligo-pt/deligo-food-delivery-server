import mongoose from 'mongoose';
import { USER_STATUS } from '../../constant/user.constant';
import { AddressType } from './customer.constant';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/global.interface';

export type TCustomer = {
  // ------------------------------------------------------
  // Core Identifiers
  // ------------------------------------------------------
  _id?: string;
  authUserId: string;
  customUserId: string;
  role: 'CUSTOMER';
  email?: string;
  status: keyof typeof USER_STATUS;
  isDeleted: boolean;

  // Name & Contact Number
  name?: {
    firstName?: string;
    lastName?: string;
  };
  contactNumber?: string;

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
  // Referral & Loyalty
  // ------------------------------------------------------
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;

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
