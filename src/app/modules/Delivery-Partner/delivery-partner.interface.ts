import { TLoginDevice, USER_STATUS } from '../../constant/user.constant';

export type TDeliveryPartner = {
  // -------------------------------------------------
  // Core Identifiers
  // -------------------------------------------------
  _id?: string;
  userId: string;
  registeredBy?: string;
  role: 'DELIVERY_PARTNER';
  email: string;
  password: string;
  status: keyof typeof USER_STATUS;
  isEmailVerified: boolean;
  isDeleted: boolean;

  // FCM tokens
  fcmTokens?: string[];

  // OTP & Password Reset
  otp?: string;
  isOtpExpired?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpiresAt?: Date;

  profilePhoto?: string;
  passwordChangedAt?: Date;

  // -------------------------------------------------
  // 1) Personal Information
  // -------------------------------------------------
  personalInfo?: {
    name?: {
      firstName?: string;
      lastName?: string;
    };
    dateOfBirth?: Date;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    nationality?: string;

    nifNumber?: string;
    citizenCardNumber?: string;
    passportNumber?: string;
    idExpiryDate?: Date;

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

    contactNumber?: string;
  };

  // -------------------------------------------------
  // 2) Legal Status / Work Rights
  // -------------------------------------------------
  legalStatus?: {
    residencePermitType?: string;
    residencePermitNumber?: string;
    residencePermitExpiry?: Date;
  };

  // -------------------------------------------------
  // 3) Payment & Banking Details
  // -------------------------------------------------
  bankDetails?: {
    bankName?: string;
    accountHolderName?: string;
    iban?: string;
    swiftCode?: string;
  };

  // -------------------------------------------------
  // 4) Vehicle Information
  // -------------------------------------------------
  vehicleInfo?: {
    vehicleType?: 'BICYCLE' | 'E-BIKE' | 'SCOOTER' | 'MOTORBIKE' | 'CAR';
    brand?: string;
    model?: string;
    licensePlate?: string;

    drivingLicenseNumber?: string;
    drivingLicenseExpiry?: Date;

    insurancePolicyNumber?: string;
    insuranceExpiry?: Date;
  };

  // -------------------------------------------------
  // 5) Criminal Background
  // -------------------------------------------------
  criminalRecord?: {
    certificate?: boolean;
    issueDate?: Date;
  };

  // -------------------------------------------------
  // 6) Work Preferences & Equipment
  // -------------------------------------------------
  workPreferences?: {
    preferredZones?: string[];
    preferredHours?: string[];
    hasEquipment?: {
      isothermalBag?: boolean;
      helmet?: boolean;
      powerBank?: boolean;
    };
    workedWithOtherPlatform?: boolean;
    otherPlatformName?: string;
  };

  // -------------------------------------------------
  // 7) Operational Statistics
  // -------------------------------------------------
  operationalData?: {
    totalDeliveries?: number;
    completedDeliveries?: number;
    canceledDeliveries?: number;
    rating?: {
      average: number;
      totalReviews: number;
    };
  };

  // -------------------------------------------------
  // 8) Earnings Summary
  // -------------------------------------------------
  earnings?: {
    totalEarnings?: number;
    pendingEarnings?: number;
  };

  // -------------------------------------------------
  // 9) Documents
  // -------------------------------------------------
  documents?: {
    idDocumentFront?: string;
    idDocumentBack?: string;
    drivingLicense?: string;
    vehicleRegistration?: string;
    criminalRecordCertificate?: string;
  };

  // -------------------------------------------------
  // 10) Security & Access
  // -------------------------------------------------
  twoFactorEnabled?: boolean;
  loginDevices?: TLoginDevice[];

  // -------------------------------------------------
  // 11) Admin Workflow (Approval System)
  // -------------------------------------------------
  approvedBy?: string;
  rejectedBy?: string;
  blockedBy?: string;
  submittedForApprovalAt?: Date;
  approvedOrRejectedOrBlockedAt?: Date;
  remarks?: string;

  // -------------------------------------------------
  // Timestamps
  // -------------------------------------------------
  createdAt?: Date;
  updatedAt?: Date;
};

// Document Upload Types
export type TDeliveryPartnerImageDocuments = {
  docImageTitle:
    | 'idDocumentFront'
    | 'idDocumentBack'
    | 'drivingLicense'
    | 'vehicleRegistration'
    | 'criminalRecordCertificate';
};
