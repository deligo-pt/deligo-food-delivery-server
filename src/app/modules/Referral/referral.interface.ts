import mongoose from 'mongoose';

export type TReferral = {
  referrerId: mongoose.Types.ObjectId; // Owner of the code
  referredId: mongoose.Types.ObjectId;

  referrerModel: 'Customer' | 'Vendor' | 'DeliveryPartner';
  referredModel: 'Customer' | 'Vendor' | 'DeliveryPartner';

  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  remarks?: string;
  rewardAmount: number;
  isRewardDistributed: boolean;

  referenceOrderId?: mongoose.Types.ObjectId;

  distributedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
