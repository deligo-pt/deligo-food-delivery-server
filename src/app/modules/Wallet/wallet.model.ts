import { Schema, model } from 'mongoose';
import { TWallet } from './wallet.interface';

// -------------------------------------------------------------------------
// Wallet Schema
// -------------------------------------------------------------------------
const walletSchema = new Schema<TWallet>(
  {
    walletId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      refPath: 'userModel',
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Admin', 'Customer', 'Vendor', 'FleetManager', 'DeliveryPartner'],
    },
    lastSettlementDate: {
      type: Date,
      default: null,
    },
    totalUnpaidTax: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    totalUnpaidEarnings: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    totalRiderPayable: {
      type: Number,
    },
    totalFleetEarnings: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

walletSchema.index({ userId: 1, userModel: 1 });

export const Wallet = model<TWallet>('Wallet', walletSchema);
