import mongoose from 'mongoose';
import { TLoginDevice, USER_STATUS } from '../../constant/user.constant';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/global.interface';

// export type TVendorSchedule = {
//   day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
//   open: string; // e.g., "09:00" (24-hour format is best for logic)
//   close: string; // e.g., "23:00"
//   isClosed: boolean;
// };

export type TRegisteredByModel = 'Admin' | 'Vendor';

export type TVendor = {
  // --------------------------------------------------------
  // Core Identifiers
  // --------------------------------------------------------
  _id?: string;
  userId: string;
  registeredBy?: {
    id: mongoose.Types.ObjectId;
    model: TRegisteredByModel;
    role: 'ADMIN' | 'SUPER_ADMIN' | 'VENDOR';
  };
  role: 'VENDOR' | 'SUB_VENDOR';
  email: string;
  password: string;

  status: keyof typeof USER_STATUS;
  isEmailVerified: boolean;
  isDeleted: boolean;
  isUpdateLocked: boolean;

  // Push notifications
  fcmTokens?: string[];

  // --------------------------------------------------------
  // Pending temporary Email and contact number
  // --------------------------------------------------------
  pendingEmail?: string;
  pendingContactNumber?: string;

  // --------------------------------------------------------
  // OTP & Password Reset
  // --------------------------------------------------------
  otp?: string;
  isOtpExpired?: Date;

  passwordResetToken?: string;
  passwordResetTokenExpiresAt?: Date;
  passwordChangedAt?: Date;

  // --------------------------------------------------------
  // Personal Information
  // --------------------------------------------------------
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
    longitude?: number;
    latitude?: number;
    geoAccuracy?: number;
    detailedAddress?: string;
  };

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

    // Detailed Schedule
    // schedule: TVendorSchedule[]; // Use the detailed schedule interface
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

  currentSessionLocation?: TGeoJSONPoint;

  // --------------------------------------------------------
  // Banking & Payments
  // --------------------------------------------------------
  bankDetails?: {
    bankName: string;
    accountHolderName: string;
    iban: string;
    swiftCode: string;
  };

  // --------------------------------------------------------
  // Documents & Verification
  // --------------------------------------------------------
  documents?: {
    businessLicenseDoc?: string;
    taxDoc?: string;
    idProofFront?: string;
    idProofBack?: string;
    storePhoto?: string;
    menuUpload?: string;
  };

  // --------------------------------------------------------
  // Security & Access
  // --------------------------------------------------------
  twoFactorEnabled?: boolean;
  loginDevices?: TLoginDevice[];

  // --------------------------------------------------------
  // Rating & Activity
  // --------------------------------------------------------
  rating?: {
    average: number;
    totalReviews: number;
  };

  totalOrders?: number;
  lastLoginAt?: Date;

  // --------------------------------------------------------
  // Admin Workflow / Audit
  // --------------------------------------------------------
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  blockedBy?: mongoose.Types.ObjectId;

  submittedForApprovalAt?: Date;
  approvedOrRejectedOrBlockedAt?: Date;

  remarks?: string;

  // --------------------------------------------------------
  // Timestamps
  // --------------------------------------------------------
  createdAt: Date;
  updatedAt: Date;
};

export type TVendorImageDocuments = {
  docImageTitle:
    | 'businessLicenseDoc'
    | 'taxDoc'
    | 'idProofFront'
    | 'idProofBack'
    | 'storePhoto'
    | 'menuUpload';
};
