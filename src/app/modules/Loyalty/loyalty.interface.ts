import { Schema } from 'mongoose';
import { TUserModel } from '../Support/support.interface';
import { TUserRole } from '../../constant/user.constant';

type TReferralModel = 'Order' | 'Referral' | 'RewardClaim';

export type TPoints = {
  _id: Schema.Types.ObjectId;
  userId: {
    id: Schema.Types.ObjectId;
    model: TUserModel;
    role: TUserRole;
  };
  currentPoints: number;
  totalEarned: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
};

export type TPointsLog = {
  _id: Schema.Types.ObjectId;
  userId: {
    id: Schema.Types.ObjectId;
    model: TUserModel;
    role: TUserRole;
  };
  points: number;
  transactionType:
    | 'EARN'
    | 'REDEEM'
    | 'REFERRAL_BONUS'
    | 'REFUND'
    | 'ADJUSTMENT'
    | 'OTHER';
  referenceId?: Schema.Types.ObjectId;
  onModel?: TReferralModel;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TReferral = {
  _id: Schema.Types.ObjectId;
  userId: {
    id: Schema.Types.ObjectId;
    model: TUserModel;
    role: TUserRole;
  };
  referredUserId: {
    id: Schema.Types.ObjectId;
    model: TUserModel;
    role: TUserRole;
  };
  status: 'PENDING' | 'QUALIFIED' | 'REWARDED';
  rewardLevel: number;
  orderCompleted: boolean;
  orderAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type TRewardItem = {
  _id: Schema.Types.ObjectId;
  name: string;
  requiredPoints: number;
  estimatedSpend: string;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
