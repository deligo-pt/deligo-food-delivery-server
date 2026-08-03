import mongoose from 'mongoose';
import { OfferType } from './offer.constant';
import { TLocalizedText } from '../../constant/GlobalInterface/language.interface';

export type TOffer = {
  _id?: string;
  title: TLocalizedText;
  description?: TLocalizedText;

  // Offer type
  offerType: OfferType;

  // Auto apply or manual code (optional)
  code?: string | null;
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
    buyProductId?: mongoose.Types.ObjectId; // Trigger: buy this exact product (X)
    buyCategoryId?: mongoose.Types.ObjectId; // Trigger: buy any product in this category (Y)
    getProductId?: mongoose.Types.ObjectId; // Reward item (Z); defaults to buyProductId when omitted
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
