import { TLoginDevice, USER_STATUS } from '../../constant/user.constant';
import { currentStatusOptions } from './delivery-partner.constant';

export type TDeliveryPartner = {
  // -------------------------------------------------
  // Core Identifiers & Credentials
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
  isUpdateLocked: boolean;

  // FCM tokens for push notifications
  fcmTokens?: string[];

  // ------------------------------------------------------
  // OTP & Password Reset
  // ------------------------------------------------------
  otp?: string;
  isOtpExpired?: Date;
  requiresOtpVerification?: boolean;

  passwordResetToken?: string;
  passwordResetTokenExpiresAt?: Date;
  passwordChangedAt?: Date;

  // ------------------------------------------------------
  // Operational & Real-Time Data
  // ------------------------------------------------------
  operationalInfo: {
    currentStatus: keyof typeof currentStatusOptions; // Current working state (IDLE, ON_DELIVERY, OFFLINE)
    currentZoneId?: string; // DeliGo Zone ID (e.g., 'Lisbon-Zone-02')
    currentOrderIds?: string[]; // List of active order IDs they are currently fulfilling
    capacity: number; // Max number of orders the driver can carry (e.g., 2 or 3)
    isWorking: boolean; // Simple flag: Clocked in/out
  };

  // -------------------------------------------------
  // Live Location (Required for Geo-Search & Nearest Match)
  // -------------------------------------------------
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    accuracy?: number; // GPS Accuracy in meters (lower is better)
    lastLocationUpdate: Date; // Timestamp for data freshness (Crucial for filtering stale data)
  };

  // -------------------------------------------------
  // 1) Personal Information
  // -------------------------------------------------
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
  personalInfo?: {
    dateOfBirth?: Date;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    nationality?: string;
    nifNumber?: string;
    citizenCardNumber?: string;
    passportNumber?: string;
    idExpiryDate?: Date;
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

// Document Upload Types (unchanged)
export type TDeliveryPartnerImageDocuments = {
  docImageTitle:
    | 'idDocumentFront'
    | 'idDocumentBack'
    | 'drivingLicense'
    | 'vehicleRegistration'
    | 'criminalRecordCertificate';
};
