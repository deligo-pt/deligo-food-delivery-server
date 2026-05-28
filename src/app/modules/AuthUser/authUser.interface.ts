import mongoose from 'mongoose';
import {
  TUserRole,
  TUserStatus,
} from '../../constant/GlobalConstant/user.constant';
import { TLoginDevice } from '../../constant/GlobalInterface/user.interface';
import { TUserModel } from '../Support/support.interface';

export type TAuthUser = {
  _id: mongoose.Types.ObjectId;
  // ------------------------------------------------------------------
  // 1. Core Identifiers & Relations Mapping
  // ------------------------------------------------------------------
  userAuthId: string; // UUID for future central Auth Service synchronization
  userId: string; // Generated readable custom ID (e.g., 'VND-1002', 'FM-MLSE40CI')
  userObjectId: mongoose.Types.ObjectId; // Reference to the specific profile document's MongoDB _id
  onModel: TUserModel;
  email: string; // Unique primary email used as the login identifier
  contactNumber: string; // Unique mobile number used as the login identifier
  role: TUserRole; // System role (e.g., 'SUPER_ADMIN', 'VENDOR', 'CUSTOMER', etc.)

  // ------------------------------------------------------------------
  // 2. Live Status & Access Control (RBAC)
  // ------------------------------------------------------------------
  status: TUserStatus; // Account state: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'BLOCKED'
  permissions: mongoose.Types.ObjectId[]; // Granular permissions array for custom routing/RBAC
  isDeleted: boolean; // Soft delete flag for database retention

  // ------------------------------------------------------------------
  // 3. Real-Time Device Management & Session Tracking
  // ------------------------------------------------------------------
  loginDevices: TLoginDevice[]; // Array to track active sessions, device limits, and FCM tokens

  // ------------------------------------------------------------------
  // 4. OTP & Email Verification Flow
  // ------------------------------------------------------------------
  isEmailVerified: boolean; // Global flag to track email verification state
  isContactNumberVerified: boolean; // Global flag to track mobile number verification state

  requiresOtpVerification?: boolean;
  mobileOtpId?: string;
  // ------------------------------------------------------------------
  // 5. Password Credentials & Security Audit Logs
  // ------------------------------------------------------------------
  password?: string; // Hashed password (mirrored here during dual-update mode)
  passwordResetToken?: string | null; // Token used for account recovery or password resets
  passwordResetTokenExpiresAt?: Date | null;
  passwordChangedAt?: Date | null; // Tracks password updates to invalidate older active JWT sessions
  twoFactorEnabled?: boolean; // Flag indicating if two-factor authentication is active

  // ------------------------------------------------------------------
  // 6. Timestamps
  // ------------------------------------------------------------------
  createdAt?: Date;
  updatedAt?: Date;
};
