import { Schema, model } from 'mongoose';
import {
  TPoints,
  TPointsLog,
  TReferral,
  TRewardItem,
} from './loyalty.interface';
import { ALL_USER_MODELS } from '../Auth/auth.constant';

// --------------------------------------------------
// 1. Points Model
// --------------------------------------------------
const PointsSchema = new Schema<TPoints>(
  {
    userId: {
      id: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'userId.model',
      },
      model: {
        type: String,
        required: true,
        enum: ALL_USER_MODELS,
      },
      role: { type: String, required: true },
    },
    currentPoints: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Points = model<TPoints>('Points', PointsSchema);

// --------------------------------------------------
// 2. PointsLog Model
// --------------------------------------------------
const PointsLogSchema = new Schema<TPointsLog>(
  {
    userId: {
      id: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'userId.model',
      },
      model: { type: String, required: true, enum: ALL_USER_MODELS },
      role: { type: String, required: true },
    },
    points: { type: Number, required: true },
    transactionType: {
      type: String,
      enum: [
        'EARN',
        'REDEEM',
        'REFERRAL_BONUS',
        'REFUND',
        'ADJUSTMENT',
        'OTHER',
      ],
      required: true,
    },
    referenceId: { type: Schema.Types.ObjectId },
    onModel: { type: String, enum: ['Order', 'Referral', 'RewardClaim'] },
    description: { type: String, required: true },
  },
  { timestamps: true },
);

export const PointsLog = model<TPointsLog>('PointsLog', PointsLogSchema);

// --------------------------------------------------
// 3. Referral Model
// --------------------------------------------------
const ReferralSchema = new Schema<TReferral>(
  {
    userId: {
      id: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'userId.model',
      },
      model: { type: String, required: true, enum: ALL_USER_MODELS },
      role: { type: String, required: true },
    },
    referredUserId: {
      id: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'referredUserId.model',
      },
      model: { type: String, required: true, enum: ALL_USER_MODELS },
      role: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['PENDING', 'QUALIFIED', 'REWARDED'],
      default: 'PENDING',
    },
    rewardLevel: { type: Number, default: 1 },
    orderCompleted: { type: Boolean, default: false },
    orderAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Referral = model<TReferral>('Referral', ReferralSchema);

// --------------------------------------------------
// 4. RewardItem Model
// --------------------------------------------------
const RewardItemSchema = new Schema<TRewardItem>(
  {
    name: { type: String, required: true },
    requiredPoints: { type: Number, required: true },
    estimatedSpend: { type: String },
    stock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const RewardItem = model<TRewardItem>('RewardItem', RewardItemSchema);

PointsSchema.index({ 'userId.id': 1, 'userId.model': 1 }, { unique: true });
ReferralSchema.index(
  { 'userId.id': 1, 'referredUserId.id': 1 },
  { unique: true },
);
