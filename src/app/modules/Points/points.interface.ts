import { Schema } from 'mongoose';
import { TUserModel } from '../Support/support.interface';

type TReferralModel = 'Order' | 'Referral' | 'RewardClaim';

export type TPoints = {
  _id: Schema.Types.ObjectId;
  userObjectId: {
    id: Schema.Types.ObjectId;
    model: TUserModel;
  };
  currentPoints: number;
  totalEarned: number;
  totalSpent: number;
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type TPointsLog = {
  _id: Schema.Types.ObjectId;
  userObjectId: {
    id: Schema.Types.ObjectId;
    model: TUserModel;
  };
  points: number;
  transactionType:
    | 'EARN'
    | 'REDEEM'
    | 'REFERRAL_BONUS'
    | 'REFUND'
    | 'ADJUSTMENT'
    | 'FAILED_LOG'
    | 'OTHER';
  referenceId?: Schema.Types.ObjectId;
  onModel?: TReferralModel;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};
