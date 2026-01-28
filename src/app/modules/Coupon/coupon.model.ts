import { model, Schema } from 'mongoose';
import { TCoupon } from './coupon.interface';

const couponSchema = new Schema<TCoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    isGlobal: { type: Boolean, default: false },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },
    discountType: {
      type: String,
      enum: ['PERCENT', 'FLAT'],
      required: true,
    },
    discountValue: { type: Number, required: true },

    minPurchase: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null },

    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    userUsageLimit: { type: Number, default: 1 },

    validFrom: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },

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

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// --- Automatically deactivate expired coupons ---
couponSchema.pre('save', function (next) {
  const now = new Date();
  if (this.expiresAt && this.expiresAt < now) {
    this.isActive = false;
  }
  const usageLimit = this.usageLimit ?? null;
  const usedCount = this.usedCount ?? 0;

  if (usageLimit !== null && usedCount >= usageLimit) {
    this.isActive = false;
  }
  next();
});

export const Coupon = model<TCoupon>('Coupon', couponSchema);
