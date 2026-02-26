import { Schema, model } from 'mongoose';
import { TTransaction } from './transaction.interface';

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
      required: false,
    },
    payoutId: {
      type: Schema.Types.ObjectId,
      ref: 'Payout',
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
    },
    taxAmount: {
      type: Number,
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
      enum: ['CARD', 'MOBILE', 'WALLET', 'CASH', 'BANK_TRANSFER'],
      required: true,
    },
    remarks: {
      type: String,
      default: '',
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      refPath: 'processorModel',
    },
    processorModel: {
      type: String,
      enum: ['Admin', 'FleetManager'],
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 });

export const Transaction = model<TTransaction>(
  'Transaction',
  transactionSchema,
);
