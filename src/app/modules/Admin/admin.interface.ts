import mongoose from 'mongoose';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/location.interface';
import { TLoginDevice } from '../../constant/GlobalInterface/user.interface';

export type TAdmin = {
  // ------------------------------------------------------------------
  // Core Identifiers
  // ------------------------------------------------------------------
  _id: string;
  userId: string;
  registeredBy?: mongoose.Types.ObjectId;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'AGENT';
  email: string;
  password: string;
  status: keyof typeof USER_STATUS;
  isEmailVerified: boolean;
  isDeleted: boolean;
  isUpdateLocked: boolean;

  // --------------------------------------------------------
  // Pending temporary Email and contact number
  // --------------------------------------------------------
  pendingEmail?: string;
  pendingContactNumber?: string;

  // ------------------------------------------------------
  // OTP & Password Reset
  // ------------------------------------------------------
  otp?: string;
  isOtpExpired?: Date;

  passwordResetToken?: string;
  passwordResetTokenExpiresAt?: Date;
  passwordChangedAt?: Date;

  // ------------------------------------------------------------------
  // Personal Information
  // ------------------------------------------------------------------
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

  NIF?: string;

  currentSessionLocation?: TGeoJSONPoint;

  // ---------------------------------------------
  // Documents & Verification
  // ---------------------------------------------
  documents?: {
    idProofFront?: string;
    idProofBack?: string;
  };

  // ------------------------------------------------------------------
  // Security & Authentication
  // ------------------------------------------------------------------
  twoFactorEnabled?: boolean;
  loginDevices?: TLoginDevice[];

  // ------------------------------------------------------------------
  // Permissions & Role Controls
  // ------------------------------------------------------------------
  permissions: mongoose.Types.ObjectId[];
  // Example: ['MANAGE_USERS', 'APPROVE_VENDORS']

  // ------------------------------------------------------------------
  // Admin Workflow & Audit Logs
  // ------------------------------------------------------------------
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  blockedBy?: mongoose.Types.ObjectId;

  submittedForApprovalAt?: Date;
  approvedOrRejectedOrBlockedAt?: Date;

  remarks?: string;

  // ------------------------------------------------------------------
  // Timestamps
  // ------------------------------------------------------------------
  createdAt?: Date;
  updatedAt?: Date;
};
