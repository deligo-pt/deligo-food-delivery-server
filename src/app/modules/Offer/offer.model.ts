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

    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    isGlobal: { type: Boolean, default: false },
    vendorId: { type: Schema.Types.ObjectId, default: null, ref: 'Vendor' },

    discountValue: {
      type: Number,
    },
    maxDiscountAmount: { type: Number },

    bogo: {
      type: bogoSchema,
    },

    validFrom: { type: Date, required: true },
    expiresAt: { type: Date, required: true },

    minOrderAmount: { type: Number, default: 0 },
    applicableCategories: {
      type: [Schema.Types.ObjectId],
      ref: 'ProductCategory',
      default: [],
    },
    applicableProducts: {
      type: [Schema.Types.ObjectId],
      ref: 'Product',
      default: [],
    },

    maxUsageCount: { type: Number },
    usageCount: { type: Number, default: 0 },
    userUsageLimit: { type: Number, default: 1 },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

offerSchema.index({ isGlobal: 1, isActive: 1 });
offerSchema.index({ vendorId: 1, isActive: 1 });
offerSchema.index({ code: 1, isActive: 1 });
offerSchema.index({ validFrom: 1, expiresAt: 1 });

export const Offer = model<TOffer>('Offer', offerSchema);
