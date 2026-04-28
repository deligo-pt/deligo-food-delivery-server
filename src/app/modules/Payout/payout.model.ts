import { Schema, model } from 'mongoose';
import { TPayout } from './payout.interface';

// -------------------------------------------------------------------------
// Payout Schema
// -------------------------------------------------------------------------

const payoutSchema = new Schema<TPayout>(
  {
    payoutId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel',
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Vendor', 'DeliveryPartner', 'FleetManager'],
    },
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'senderModel',
    },
    senderModel: {
      type: String,
      required: true,
      enum: ['Admin', 'FleetManager'],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED'],
      default: 'PENDING',
    },
    paymentMethod: {
      type: String,
      enum: ['BANK_TRANSFER', 'MOBILE_BANKING', 'CASH'],
      required: true,
    },
    bankDetails: {
      bankName: {
        type: String,
        trim: true,
      },
      accountHolderName: {
        type: String,
        trim: true,
      },
      accountNumber: {
        type: String,
        trim: true,
      },
      iban: {
        type: String,
        trim: true,
      },
      swiftCode: {
        type: String,
        trim: true,
      },
    },
    bankReferenceId: {
      type: String,
      trim: true,
    },
    payoutProof: {
      type: String,
    },
    remarks: {
      type: String,
      default: '',
    },

    failedAt: {
      type: Date,
    },
    failedReason: {
      type: String,
      trim: true,
    },
    retryAt: {
      type: Date,
    },
    retryRemarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Payout = model<TPayout>('Payout', payoutSchema);
