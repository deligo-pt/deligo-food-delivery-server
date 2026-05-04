import { Types } from 'mongoose';

export type TDeliGoBalance = {
  userId: Types.ObjectId;
  userModel: 'Customer' | 'Vendor' | 'DeliveryPartner' | 'FleetManager';
  totalBalance: number;
  pendingBalance: number;
  totalEarned: number;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
  updatedAt: Date;
};
