import mongoose from 'mongoose';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/global.interface';
import { USER_STATUS } from '../../constant/user.constant';

export type TRegisteredByModel = 'Admin' | 'Vendor';

export type TVendor = {
  // --------------------------------------------------------
  // Core Identifiers
  // --------------------------------------------------------
  _id?: string;
  authUserId: string;
  customUserId: string;
  email: string;
  role: 'VENDOR' | 'SUB_VENDOR';
  isUpdateLocked: boolean;
  isDeleted: boolean;
  status: keyof typeof USER_STATUS;

  // --------------------------------------------------------
  // Name
  // --------------------------------------------------------
  name?: {
    firstName?: string;
    lastName?: string;
  };
  contactNumber?: string;

  // --------------------------------------------------------
  // Business Details
  // --------------------------------------------------------
  businessDetails?: {
    businessName: string;
    businessType: string;
    businessLicenseNumber?: string;
    NIF?: string;
    totalBranches: number;

    openingHours?: string; // "09:00 AM"
    closingHours?: string; // "11:00 PM"
    closingDays?: string[]; // ["Friday", "Holidays"]

    // Operational Status
    isStoreOpen: boolean; // Simple ON/OFF switch for the vendor
    storeClosedAt?: Date;

    // Zone Association
    deliveryZoneId: string; // The primary zone for assignment and pricing

    // Timing details
    preparationTimeMinutes: number; // Avg time to prepare an order (e.g., 15)
  };

  // --------------------------------------------------------
  // Business Location
  // --------------------------------------------------------
  businessLocation?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    longitude?: number;
    latitude?: number;
    geoAccuracy?: number;
  };

  // --------------------------------------------------------
  // Referral Details
  // --------------------------------------------------------
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;

  currentSessionLocation?: TGeoJSONPoint;

  // --------------------------------------------------------
  // Banking & Payments
  // --------------------------------------------------------
  bankDetails?: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    iban: string;
    swiftCode: string;
  };

  // --------------------------------------------------------
  // Rating & Activity
  // --------------------------------------------------------
  rating?: {
    average: number;
    totalReviews: number;
  };

  // --------------------------------------------------------
  // Timestamps
  // --------------------------------------------------------
  createdAt: Date;
  updatedAt: Date;
};
