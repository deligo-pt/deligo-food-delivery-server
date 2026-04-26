import { Schema, model } from 'mongoose';
import { TReferral } from './referral.interface';

const referralSchema = new Schema<TReferral>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Referrer ID is required'],
      refPath: 'referrerModel',
    },
    referredId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Referred ID is required'],
      refPath: 'referredModel',
      unique: true,
    },
    referrerModel: {
      type: String,
      required: true,
      enum: ['Customer', 'Vendor', 'DeliveryPartner'],
    },
    referredModel: {
      type: String,
      required: true,
      enum: ['Customer', 'Vendor', 'DeliveryPartner'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'EXPIRED'],
      default: 'PENDING',
    },
    remarks: {
      type: String,
    },
    rewardAmount: {
      type: Number,
      default: 0,
    },
    isRewardDistributed: {
      type: Boolean,
      default: false,
    },
    referenceOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    distributedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

referralSchema.index({ referrerId: 1, status: 1 });

export const Referral = model<TReferral>('Referral', referralSchema);
