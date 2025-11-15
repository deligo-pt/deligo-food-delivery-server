import { USER_STATUS } from '../../constant/user.const';

export type TDeliveryPartner = {
  _id?: string;
  userId: string;
  registeredBy?: string;
  role: 'DELIVERY_PARTNER';
  email: string;
  password: string;
  status: keyof typeof USER_STATUS;
  isEmailVerified: boolean;
  isDeleted: boolean;

  // FCM tokens for push notifications
  fcmTokens?: string[];

  // OTP Details
  otp?: string;
  isOtpExpired?: Date;

  // 1) Personal Information
  personalInfo?: {
    Name?: {
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
    idDocumentFront?: string;
    idDocumentBack?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
    };
    contactNumber?: string;
  };
  profilePhoto?: string;
  passwordChangedAt?: Date;

  // 2) Right to Work / Legal Status
  legalStatus?: {
    residencePermitType?: string;
    residencePermitNumber?: string;
    residencePermitExpiry?: Date;
  };

  // 3) Payment & Banking Details
  bankDetails?: {
    bankName?: string;
    accountHolderName?: string;
    iban?: string;
    swiftCode?: string;
  };

  // 4) Vehicle Information
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

  // 5) Criminal Background
  criminalRecord?: {
    certificate?: string;
    issueDate?: Date;
  };

  // 6) Equipment / Availability
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

  // Operational Data (existing)
  operationalData?: {
    totalDeliveries?: number;
    completedDeliveries?: number;
    canceledDeliveries?: number;
    rating?: {
      average: number;
      totalReviews: number;
    };
  };

  // Earnings (existing)
  earnings?: {
    totalEarnings?: number;
    pendingEarnings?: number;
  };

  // Documents (existing)
  documents?: {
    idProof?: string;
    drivingLicense?: string;
    vehicleRegistration?: string;
  };

  // Security & Access (existing)
  twoFactorEnabled?: boolean;
  loginDevices?: { deviceId: string; lastLogin: Date }[];
  approvedBy?: string;
  rejectedBy?: string;
  blockedBy?: string;
  submittedForApprovalAt?: Date;
  approvedOrRejectedOrBlockedAt?: Date;
  remarks?: string;

  createdAt?: Date;
  updatedAt?: Date;
};
