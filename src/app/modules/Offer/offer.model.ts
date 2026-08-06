import { Schema, model } from 'mongoose';
import { TOffer } from './offer.interface';
import { OFFER_TYPE } from './offer.constant';
import { localizedSchema } from '../../constant/GlobalModel/language.model';

const bogoSchema = new Schema(
  {
    buyQty: { type: Number, required: true, min: 1 },
    getQty: { type: Number, required: true, min: 1 },
    buyProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    buyCategoryId: { type: Schema.Types.ObjectId, ref: 'ProductCategory' },
    getProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    includeAddons: { type: Boolean, default: false },
  },
  { _id: false },
);

const offerSchema = new Schema<TOffer>(
  {
    title: { type: localizedSchema },
    description: { type: localizedSchema },

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
// getApplicableOffers() filters isActive+isDeleted (equality) then
// expiresAt >= now (range); validFrom <= now is checked in-memory since a
// compound index can only range-scan on one field per the ESR rule.
offerSchema.index({ isActive: 1, isDeleted: 1, expiresAt: 1 });

export const Offer = model<TOffer>('Offer', offerSchema);
