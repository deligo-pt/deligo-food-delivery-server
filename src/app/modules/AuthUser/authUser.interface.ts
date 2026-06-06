import mongoose from 'mongoose';
import { TUserModel } from '../Support/support.interface';
import {
  TUserRole,
  TUserStatus,
} from '../../constant/GlobalConstant/user.constant';

export type TAuthUser = {
  _id: mongoose.Types.ObjectId;
  userId: string; // Generated readable custom ID (e.g., 'VND-1002', 'FM-MLSE40CI')
  email: string; // Unique primary email used as the login identifier
  contactNumber: string; // Unique mobile number used as the login identifier
  role: TUserRole; // System role (e.g., 'SUPER_ADMIN', 'VENDOR', 'CUSTOMER', etc.)

  // ------------------------------------------------------------------
  // 2. Live Status & Access Control (RBAC)
  // ------------------------------------------------------------------
  status: TUserStatus; // Live status of the user (e.g., 'APPROVED', 'PENDING', etc.)
  isDeleted: boolean; // Soft delete flag for database retention

  createdAt?: Date;
  updatedAt?: Date;
};
