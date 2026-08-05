import { Schema, model } from 'mongoose';
import { TWallet } from './wallet.interface';

const walletSchema = new Schema<TWallet>(
  {
    walletId: { type: String, required: true, unique: true, trim: true },
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
    lastSettlementDate: { type: Date, default: null },

    currentBalance: { type: Number, default: 0, min: 0 },
    lockedBalance: { type: Number, default: 0, min: 0 },
    lifetimeEarnings: { type: Number, default: 0, min: 0 },
    currentTaxLiability: { type: Number, min: 0 },
    lifetimeTaxProcessed: { type: Number, min: 0 },
  },
  { timestamps: true },
);

export const Wallet = model<TWallet>('Wallet', walletSchema);
