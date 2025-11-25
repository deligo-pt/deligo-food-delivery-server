import { TLoginDevice, USER_STATUS } from '../../constant/user.constant';

export type TVendor = {
  // --------------------------------------------------------
  // Core Identifiers
  // --------------------------------------------------------
  _id?: string;
  userId: string;
  role: 'VENDOR';
  email: string;
  password: string;

  status: keyof typeof USER_STATUS;
  isEmailVerified: boolean;
  isDeleted: boolean;

  // Push notifications
  fcmTokens?: string[];

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
    latitude?: number;
    longitude?: number;
    geoAccuracy?: number;
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
    latitude?: number;
    longitude?: number;
    geoAccuracy?: number;
  };

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
    idProof?: string;
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
  approvedBy?: string;
  rejectedBy?: string;
  blockedBy?: string;

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
    | 'idProof'
    | 'storePhoto'
    | 'menuUpload';
};
