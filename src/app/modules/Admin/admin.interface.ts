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

  // ------------------------------------------------------------------
  // Personal Profile
  // ------------------------------------------------------------------
  name?: {
    firstName?: string;
    lastName?: string;
  };

  contactNumber?: string;

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

  profilePhoto?: string;

  // ------------------------------------------------------------------
  // Security & Authentication
  // ------------------------------------------------------------------
  passwordChangedAt?: Date;
  twoFactorEnabled?: boolean;
  loginDevices?: TLoginDevice[];

  fcmTokens?: string[]; // Push notifications

  // OTP
  otp?: string;
  isOtpExpired?: Date;

  // Password reset
  passwordResetToken?: string;
  passwordResetTokenExpiresAt?: Date;

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
