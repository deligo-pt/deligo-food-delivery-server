import { model, Schema } from 'mongoose';
import { TCoupon } from './coupon.interface';

const couponSchema = new Schema<TCoupon>(
  {
    userObjectId: {
      type: Schema.Types.ObjectId,
      refPath: 'userModel',
      required: true,
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Customer', 'Vendor', 'DeliveryPartner', 'FleetManager', 'Admin'],
    },
    code: {
      type: String,
      unique: true,
      required: true,
    },
    type: {
      type: String,
      enum: ['FREE_MEAL', 'FREE_DELIVERY'],
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    expiryDate: {
      type: Date,
    },
    remarks: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

couponSchema.index({ userObjectId: 1, isUsed: 1 });

export const Coupon = model<TCoupon>('Coupon', couponSchema);
