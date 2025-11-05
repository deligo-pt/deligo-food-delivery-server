import { USER_STATUS } from '../../constant/user.const';

export type TCustomer = {
  _id?: string;
  customerId: string;
  role: 'CUSTOMER';
  email: string;
  password?: string;
  status: keyof typeof USER_STATUS;
  isEmailVerified: boolean;
  isDeleted: boolean;

  // OTP Details
  otp?: string;
  isOtpExpired?: Date;

  // Personal Details
  name?: {
    firstName?: string;
    lastName?: string;
  };
  contactNumber?: string;
  profilePhoto?: string;
  passwordChangedAt?: Date;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };

  deliveryAddresses?: Array<{
    address: string;
    isActive: boolean;
  }>;

  // Order & Activity Details
  orders: {
    totalOrders?: number;
    totalSpent?: number;
    lastOrderDate?: Date;
    lastLoginAt?: Date;
  };

  // Security & Access Details
  twoFactorEnabled?: boolean;
  loginDevices?: { deviceId: string; lastLogin: Date }[];

  // referral & loyalty
  referralCode?: string;
  loyaltyPoints?: number;

  // Admin & Audit Fields
  approvedBy?: string;
  rejectedBy?: string;
  remarks?: string;

  // paymentDetails
  paymentMethods?: Array<{
    cardType: string;
    lastFourDigits: string;
    expiryDate: string;
    isDefault: boolean;
  }>;

  // timestamps
  createdAt?: Date;
  updatedAt?: Date;
};
