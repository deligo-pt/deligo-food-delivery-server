import { USER_STATUS } from '../../constant/user.const';

export type TDeliveryPartner = {
  _id?: string;
  userId: string;
  role: 'DELIVERY_PARTNER';
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

  // Operational Data
  operationalData?: {
    totalDeliveries?: number;
    completedDeliveries?: number;
    canceledDeliveries?: number;
    rating?: {
      average: number;
      totalReviews: number;
    };
    vehicleType?: 'BIKE' | 'CAR' | 'SCOOTER' | 'BICYCLE' | 'OTHER';
    licenseNumber?: string;
  };

  // Bank Details
  bankDetails?: {
    bankName?: string;
    accountHolderName?: string;
    iban?: string;
    swiftCode?: string;
  };

  // Earnings
  earnings?: {
    totalEarnings?: number;
    pendingEarnings?: number;
  };

  // Documents
  documents?: {
    idProof?: string;
    drivingLicense?: string;
    vehicleRegistration?: string;
  };

  // Security & Access
  twoFactorEnabled?: boolean;
  loginDevices?: { deviceId: string; lastLogin: Date }[];

  approvedBy?: string;
  rejectedBy?: string;
  remarks?: string;

  // timestamps
  createdAt?: Date;
  updatedAt?: Date;
};
