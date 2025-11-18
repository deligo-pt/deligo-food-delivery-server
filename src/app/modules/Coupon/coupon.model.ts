import { model, Schema } from 'mongoose';
import { TCoupon } from './coupon.interface';

const couponSchema = new Schema<TCoupon>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    discountType: {
      type: String,
      enum: ['PERCENT', 'FLAT'],
      required: true,
    },
    discountValue: { type: Number, required: true },

    minPurchase: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 },

    usageLimit: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },

    validFrom: { type: Date, default: Date.now },
    expiresAt: { type: Date },

    applicableCategories: { type: [String], default: [] },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// --- Automatically deactivate expired coupons ---
couponSchema.pre('save', function (next) {
  if (this.expiresAt && this.expiresAt < new Date()) {
    this.isActive = false;
  }
  next();
});

export const Coupon = model<TCoupon>('Coupon', couponSchema);
