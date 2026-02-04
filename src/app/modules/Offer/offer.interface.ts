import mongoose from 'mongoose';
import { OfferType } from './offer.constant';

export type TOffer = {
  _id?: string;
  title: string;
  description?: string;

  // Offer type
  offerType: OfferType;

  // Auto apply or manual code (optional)
  code?: string;
  isAutoApply: boolean;

  adminId: mongoose.Types.ObjectId | null;
  isGlobal: boolean;
  vendorId?: mongoose.Types.ObjectId | null;

  // Discount values
  discountValue?: number;
  maxDiscountAmount?: number;

  // BOGO fields
  bogo?: {
    buyQty: number;
    getQty: number;
    productId: mongoose.Types.ObjectId;
  };

  // Validity period
  validFrom: Date;
  expiresAt: Date;

  // Eligibility
  minOrderAmount?: number;
  applicableCategories?: mongoose.Types.ObjectId[];
  applicableProducts?: mongoose.Types.ObjectId[];

  // Usage control
  maxUsageCount?: number;
  usageCount?: number;
  userUsageLimit: number;

  // Status
  isActive: boolean;
  isDeleted: boolean;

  createdAt?: Date;
  updatedAt?: Date;
};
