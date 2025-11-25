import { TLoginDevice, USER_STATUS } from '../../constant/user.constant';

export type TAdmin = {
  // ------------------------------------------------------------------
  // Core Identifiers
  // ------------------------------------------------------------------
  _id: string;
  userId: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  email: string;
  password: string;
  status: keyof typeof USER_STATUS;
  isEmailVerified: boolean;
  isDeleted: boolean;
  isUpdateLocked: boolean;

  // Push notifications
  fcmTokens?: string[];

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
    latitude?: number;
    longitude?: number;
    geoAccuracy?: number;
  };

  // ------------------------------------------------------------------
  // Security & Authentication
  // ------------------------------------------------------------------
  twoFactorEnabled?: boolean;
  loginDevices?: TLoginDevice[];

  // ------------------------------------------------------------------
  // Permissions & Role Controls
  // ------------------------------------------------------------------
  permissions?: string[];
  // Example: ['MANAGE_USERS', 'APPROVE_VENDORS']

  // ------------------------------------------------------------------
  // Admin Workflow & Audit Logs
  // ------------------------------------------------------------------
  approvedBy?: string;
  rejectedBy?: string;
  blockedBy?: string;

  submittedForApprovalAt?: Date;
  approvedOrRejectedOrBlockedAt?: Date;

  remarks?: string;

  // ------------------------------------------------------------------
  // Timestamps
  // ------------------------------------------------------------------
  createdAt?: Date;
  updatedAt?: Date;
};
