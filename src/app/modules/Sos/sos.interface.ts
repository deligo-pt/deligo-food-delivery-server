import mongoose from 'mongoose';
import { TUserRole } from '../../constant/user.constant';
export type TSosStatus =
  | 'ACTIVE'
  | 'INVESTIGATING'
  | 'RESOLVED'
  | 'FALSE_ALARM';
export type TSosIssue =
  | 'Accident'
  | 'Medical Emergency'
  | 'Fire'
  | 'Crime'
  | 'Natural Disaster'
  | 'Other';

export type TSos = {
  userId: {
    id: mongoose.Types.ObjectId;
    model: 'Customer' | 'Vendor' | 'Admin' | 'FleetManager' | 'DeliveryPartner';
    role: TUserRole;
  };
  orderId?: mongoose.Types.ObjectId;
  role: TUserRole;
  status: TSosStatus;
  userNote?: string;
  issueTags?: TSosIssue[];
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  deviceSnapshot?: {
    batteryLevel?: number;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
    networkType?: string;
  };

  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};
