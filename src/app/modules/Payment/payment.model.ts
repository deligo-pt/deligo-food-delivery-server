import { Schema, model } from 'mongoose';
import { TTransaction, TWallet } from './payment.interface';

// -------------------------------------------------------------------------
// Transaction Schema
// -------------------------------------------------------------------------
const transactionSchema = new Schema<TTransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel',
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Customer', 'Vendor', 'FleetManager', 'DeliveryPartner', 'Admin'],
    },
    baseAmount: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'ORDER_PAYMENT',
        'VENDOR_EARNING',
        'FLEET_EARNING',
        'DELIVERY_PARTNER_EARNING',
        'VENDOR_SETTLEMENT',
        'FLEET_SETTLEMENT',
        'DELIVERY_PARTNER_SETTLEMENT',
        'PLATFORM_COMMISSION',
      ],
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
    },
    paymentMethod: {
      type: String,
      enum: ['CARD', 'MOBILE'],
      required: true,
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

// -------------------------------------------------------------------------
// Wallet Schema
// -------------------------------------------------------------------------
const walletSchema = new Schema<TWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId || String,
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
      default: 0,
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

transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ transactionId: 1 });

export const Transaction = model<TTransaction>(
  'Transaction',
  transactionSchema,
);
export const Wallet = model<TWallet>('Wallet', walletSchema);
