import { Schema, model } from 'mongoose';
import { TPoints, TPointsLog } from './points.interface';

const ALL_USER_MODELS_ENUM = [
  'Admin',
  'Vendor',
  'FleetManager',
  'DeliveryPartner',
  'Customer',
];
// --------------------------------------------------
// 1. Points Model
// --------------------------------------------------
const PointsSchema = new Schema<TPoints>(
  {
    userObjectId: {
      id: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'userId.model',
      },
      model: {
        type: String,
        required: true,
        enum: ALL_USER_MODELS_ENUM,
      },
    },
    currentPoints: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    expiryDate: { type: Date, default: null },
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
      model: { type: String, required: true, enum: ALL_USER_MODELS_ENUM },
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
        'FAILED_LOG',
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

PointsSchema.index({ 'userId.id': 1, 'userId.model': 1 }, { unique: true });
