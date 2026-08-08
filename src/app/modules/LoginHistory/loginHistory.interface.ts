import { TUserRole } from '../../constant/GlobalConstant/user.constant';

export const failureReasons = [
  'INVALID_CREDENTIALS',
  'ACCOUNT_LOCKED',
  'INVALID_OTP',
  'ACCOUNT_NOT_VERIFIED',
  'ACCOUNT_DELETED',
  'LIMIT_EXCEEDED',
  'INVALID_SOCIAL_TOKEN',
  'SOCIAL_EMAIL_REQUIRED',
  'SOCIAL_ACCOUNT_ALREADY_LINKED',
  'UNKNOWN',
] as const;

export type TFailureReason = (typeof failureReasons)[number];

export const deviceTypes = ['DESKTOP', 'MOBILE', 'TABLET', 'UNKNOWN'] as const;
export type TDeviceType = (typeof deviceTypes)[number];

export type TLoginHistory = {
  id?: string;
  userId?: string;
  email: string;
  userRole: TUserRole;

  // Network & Location Info
  ipAddress: string;
  city?: string;
  country?: string;

  // Client Info
  deviceType: TDeviceType;
  browser: string;
  os: string;
  userAgent: string;

  // Status & Session
  status: 'SUCCESS' | 'FAILED';
  failureReason?: TFailureReason;
  sessionId?: string;

  // Timestamps & Duration
  loginAt: Date;
  logoutAt?: Date;
  durationSec?: number;
};
