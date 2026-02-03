import { Schema, model } from 'mongoose';
import { TOffer } from './offer.interface';
import { OFFER_TYPE } from './offer.constant';

const bogoSchema = new Schema(
  {
    buyQty: { type: Number, required: true },
    getQty: { type: Number, required: true },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
  },
  { _id: false },
);

const offerSchema = new Schema<TOffer>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },

    offerType: {
      type: String,
      enum: Object.values(OFFER_TYPE),
      required: true,
    },

    discountValue: {
      type: Number,
    },
    maxDiscountAmount: { type: Number },

    bogo: {
      type: bogoSchema,
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    vendorId: { type: Schema.Types.ObjectId, default: null, ref: 'Vendor' },
    minOrderAmount: { type: Number, default: 0 },

    isAutoApply: { type: Boolean, required: true },
    code: {
      type: String,
      trim: true,
      index: {
        unique: true,
        sparse: true,
        partialFilterExpression: { code: { $type: 'string' } },
      },
    },

    maxUsageCount: { type: Number },
    usageCount: { type: Number, default: 0 },
    limitPerUser: { type: Number },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

offerSchema.index({ code: 1, isActive: 1 });
offerSchema.index({ vendorId: 1, isActive: 1 });

export const Offer = model<TOffer>('Offer', offerSchema);
