import { USER_STATUS } from '../../constant/user.const';

export type TFleetManager = {
  _id?: string;
  userId: string;
  role: 'FLEET_MANAGER';
  email: string;
  password: string;
  status: keyof typeof USER_STATUS;
  isEmailVerified: boolean;
  isDeleted: boolean;

  // fcm token for push notifications
  fcmTokens?: string[];

  // OTP Details
  otp?: string;
  isOtpExpired?: Date | string;

  // Password Reset Details
  passwordResetToken?: string;
  passwordResetTokenExpiresAt?: Date;

  // Personal Details
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
    goAccuracy?: number;
  };

  passwordChangedAt?: Date | string;

  //  Business Details
  businessDetails?: {
    businessName: string;
    businessLicenseNumber?: string;
  };
  // business Location
  businessLocation?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
    geoAccuracy?: number; // meters
  };
  // Bank & Payment Information
  bankDetails?: {
    bankName: string;
    accountHolderName: string;
    iban: string;
    swiftCode: string;
  };
  // Documents & Verification
  documents?: {
    idProof?: string;
    businessLicense?: string;
  };

  // Operation Data
  operationalData?: {
    noOfDrivers: number;
    activeVehicles?: number;
    totalDeliveries?: number;
    rating?: {
      average: number;
      totalReviews: number;
    };
  };

  // Security & Access Control
  twoFactorEnabled?: boolean;
  loginDevices?: { deviceId: string; lastLogin: Date | string }[];

  // Admin & Audit Fields
  approvedBy?: string;
  rejectedBy?: string;
  blockedBy?: string;
  submittedForApprovalAt?: Date | string;
  approvedOrRejectedOrBlockedAt?: Date | string;
  remarks?: string;

  createdAt: Date;
  updatedAt: Date;
};

export type TFleetManagerImageDocuments = {
  docImageTitle: 'idProof' | 'businessLicense';
};
