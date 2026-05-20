import { Types } from 'mongoose';
import {
  TUserRole,
  TUserStatus,
} from '../../constant/GlobalConstant/user.constant';

export type TAuthUser = {
  _id: Types.ObjectId;
  authUserId: string;
  userObjectId: Types.ObjectId;
  customUserId: string;
  email: string;
  role: TUserRole;
  status: TUserStatus;
  permissions: string[];
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
