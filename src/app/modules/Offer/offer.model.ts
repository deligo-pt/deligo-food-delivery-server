import { Schema, model } from 'mongoose';
import { TOffer } from './offer.interface';
import { OFFER_TYPE } from './offer.constant';

const bogoSchema = new Schema(
  {
    buyQty: Number,
    getQty: Number,
    itemId: String,
  },
  { _id: false }
);

const offerSchema = new Schema<TOffer>(
  {
    title: { type: String, required: true },
    description: { type: String },

    offerType: {
      type: String,
      enum: Object.keys(OFFER_TYPE),
      required: true,
    },

    discountValue: { type: Number },
    maxDiscountAmount: { type: Number },

    bogo: bogoSchema,

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    vendorId: { type: Schema.Types.ObjectId, default: null, ref: 'Vendor' },
    minOrderAmount: { type: Number },

    isAutoApply: { type: Boolean, required: true },
    code: { type: String },

    maxUsageCount: { type: Number },
    usageCount: { type: Number, default: 0 },
    limitPerUser: { type: Number },

    isActive: { type: Boolean, default: true },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const Offer = model<TOffer>('Offer', offerSchema);
