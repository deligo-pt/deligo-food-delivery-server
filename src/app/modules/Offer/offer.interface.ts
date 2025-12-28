import mongoose from 'mongoose';

export type TOffer = {
  _id?: string;
  title: string;
  description?: string;
  // Offer type
  offerType: 'PERCENT' | 'FLAT' | 'FREE_DELIVERY' | 'BOGO';
  // Discount values
  discountValue?: number;
  maxDiscountAmount?: number;

  // BOGO fields
  bogo?: {
    buyQty: number;
    getQty: number;
    itemId: string;
  };

  // Validity period
  startDate: Date;
  endDate: Date;

  // Eligibility
  vendorId?: mongoose.Types.ObjectId | null; // null = global offer
  minOrderAmount?: number;

  // Auto apply or manual code (optional)
  isAutoApply: boolean;
  code?: string; // if offer requires a code (optional)

  // Usage control
  maxUsageCount?: number;
  usageCount?: number;
  limitPerUser?: number;

  // Status
  isActive: boolean;

  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
