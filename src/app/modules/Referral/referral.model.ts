// models/referral.model.ts
import { Schema, model } from 'mongoose';

const referralSchema = new Schema(
  {
    referrerId: { type: String, required: true },
    referrerRole: {
      type: String,
      enum: ['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER'],
      required: true,
    },
    referredUserId: { type: String, required: true },
    referredUserRole: {
      type: String,
      enum: ['CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED'],
      default: 'PENDING',
    },
    bonusAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Referral = model('Referral', referralSchema);
