import { USER_STATUS } from '../../constant/user.const';

export type TVendor = {
  _id?: string;
  userId: string;
  role: 'VENDOR';
  email: string;
  password: string;
  status: keyof typeof USER_STATUS;
  isEmailVerified: boolean;
  isDeleted: boolean;

  // Rating & Activity
  rating?: {
    average: number;
    totalReviews: number;
  };
  totalOrders?: number;
  lastLoginAt?: Date | string;

  // fcm tokens
  fcmTokens?: string[];

  // OTP Details
  otp?: string;
  isOtpExpired?: Date | string;

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
    postalCode?: string;
    country?: string;
  };

  passwordChangedAt?: Date | string;

  // Business Details
  businessDetails?: {
    businessName: string;
    businessType: string;
    businessLicenseNumber?: string;
    NIF?: string;
    noOfBranch: number;
    openingHours?: string; // e.g. "09:00 AM"
    closingHours?: string; // e.g. "11:00 PM"
    closingDays?: string[]; // ["Friday", "Public Holidays"]
  };

  // Business Location
  businessLocation?: {
    streetAddress: string;
    streetNumber: string;
    city: string;
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
    businessLicenseDoc?: string;
    taxDoc?: string;
    idProof?: string;
    storePhoto?: string;
    menuUpload?: string;
  };

  // Security & Access Control
  twoFactorEnabled?: boolean;
  loginDevices?: { deviceId: string; lastLogin: Date | string }[];

  // Admin & Audit Fields
  approvedBy?: string;
  rejectedBy?: string;
  blockedBy?: string;
  submittedForApprovalAt?: Date | string;
  approvedOrRejectedAt?: Date | string;
  remarks?: string;

  createdAt: Date | string;
  updatedAt: Date | string;
};

export type TVendorImageDocuments = {
  docImageTitle:
    | 'businessLicenseDoc'
    | 'taxDoc'
    | 'idProof'
    | 'storePhoto'
    | 'menuUpload';
};
