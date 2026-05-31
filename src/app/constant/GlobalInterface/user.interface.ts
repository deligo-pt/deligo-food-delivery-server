import mongoose from 'mongoose';
import { TUserRole, USER_STATUS } from '../GlobalConstant/user.constant';
import { TDeliveryAddress } from './address.interface';

export type TLoginDevice = {
  deviceId: string;
  deviceType: string;
  deviceName?: string;
  fcmToken?: string;
  userAgent?: string;
  ip?: string;
  isVerified: boolean;
  isLoggedIn?: boolean;
  lastLogin?: Date | null;
  lastLogout?: Date | null;
};
