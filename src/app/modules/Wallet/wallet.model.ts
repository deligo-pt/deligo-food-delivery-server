import { Schema, model } from 'mongoose';
import { TWallet } from './wallet.interface';

// -------------------------------------------------------------------------
// Wallet Schema
// -------------------------------------------------------------------------
const walletSchema = new Schema<TWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      refPath: 'userModel',
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Customer', 'Vendor', 'FleetManager', 'DeliveryPartner'],
    },
    lastSettlementDate: {
      type: Date,
      default: null,
    },
    totalUnpaidEarnings: {
      type: Number,
      default: 0,
    },
    totalRiderPayable: {
      type: Number,
    },
    totalFleetEarnings: {
      type: Number,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const Wallet = model<TWallet>('Wallet', walletSchema);
