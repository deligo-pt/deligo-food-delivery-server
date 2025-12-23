import mongoose from 'mongoose';
import { TLoginDevice, USER_STATUS } from '../../constant/user.constant';

export type TFleetManager = {
  // ---------------------------------------------
  // Core Identifiers
  // ---------------------------------------------
  _id?: string;
  userId: string;
  role: 'FLEET_MANAGER';
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

  // ---------------------------------------------
  // OTP & Password Reset
  // ---------------------------------------------
  otp?: string;
  isOtpExpired?: Date;

  passwordResetToken?: string;
  passwordResetTokenExpiresAt?: Date;
  passwordChangedAt?: Date;

  // ---------------------------------------------
  // Personal Information
  // ---------------------------------------------
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
  };

  // ---------------------------------------------
  // Business Details
  // ---------------------------------------------
  businessDetails?: {
    businessName: string;
    businessLicenseNumber?: string;
  };

  businessLocation?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
    geoAccuracy?: number;
  };

  // ---------------------------------------------
  // Bank & Payment Information
  // ---------------------------------------------
  bankDetails?: {
    bankName: string;
    accountHolderName: string;
    iban: string;
    swiftCode: string;
  };

  // ---------------------------------------------
  // Documents & Verification
  // ---------------------------------------------
  documents?: {
    idProof?: string;
    businessLicense?: string;
  };

  // ---------------------------------------------
  // Operational Data
  // ---------------------------------------------
  operationalData?: {
    totalDrivers: number;
    activeVehicles?: number;
    totalDeliveries?: number;
    rating?: {
      average: number;
      totalReviews: number;
    };
  };

  // ---------------------------------------------
  // Security & Access
  // ---------------------------------------------
  twoFactorEnabled?: boolean;
  loginDevices?: TLoginDevice[];

  // ---------------------------------------------
  // Admin Workflow / Audit
  // ---------------------------------------------
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  blockedBy?: mongoose.Types.ObjectId;

  submittedForApprovalAt?: Date;
  approvedOrRejectedOrBlockedAt?: Date;

  remarks?: string;

  // ---------------------------------------------
  // Timestamps
  // ---------------------------------------------
  createdAt: Date;
  updatedAt: Date;
};

export type TFleetManagerImageDocuments = {
  docImageTitle: 'idProof' | 'businessLicense';
};
