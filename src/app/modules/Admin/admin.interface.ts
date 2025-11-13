import { USER_STATUS } from '../../constant/user.const';

export type TAdmin = {
  _id: string;
  userId: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  email: string;
  password: string;
  status: keyof typeof USER_STATUS;
  isEmailVerified: boolean;
  isDeleted: boolean;

  // fcm tokens for push notifications
  fcmTokens?: string[];

  // OTP Details
  otp?: string;
  isOtpExpired?: Date;

  // Personal Details
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
    zipCode?: string;
  };

  profilePhoto?: string;
  passwordChangedAt?: Date;

  // Permissions
  permissions?: string[]; // Example: ['MANAGE_USERS', 'APPROVE_VENDORS']

  // Security & Access Details
  twoFactorEnabled?: boolean;
  loginDevices?: { deviceId: string; lastLogin: Date }[];

  // Admin & Audit Fields
  approvedBy?: string;
  rejectedBy?: string;
  blockedBy?: string;
  submittedForApprovalAt?: Date;
  approvedOrRejectedOrBlockedAt?: Date;
  remarks?: string;

  // timestamps
  createdAt?: Date;
  updatedAt?: Date;
};
