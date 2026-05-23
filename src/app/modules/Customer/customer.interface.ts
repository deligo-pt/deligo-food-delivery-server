import mongoose from 'mongoose';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { AddressType } from './customer.constant';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/location.interface';

export type TCustomer = {
  // ------------------------------------------------------
  // Core Identifiers
  // ------------------------------------------------------
  _id?: mongoose.Types.ObjectId;
  userCustomId: string;
  status: keyof typeof USER_STATUS;

  // --------------------------------------------------------
  // Pending temporary Email and contact number
  // --------------------------------------------------------
  pendingEmail?: string;
  pendingContactNumber?: string;

  // ------------------------------------------------------
  // Personal Information
  // ------------------------------------------------------
  name?: {
    firstName?: string;
    lastName?: string;
  };

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
  // Timestamps
  // ------------------------------------------------------
  createdAt?: Date;
  updatedAt?: Date;
};
