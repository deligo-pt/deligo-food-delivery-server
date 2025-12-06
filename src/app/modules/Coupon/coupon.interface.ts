export type TCoupon = {
  _id?: string;
  code: string; // Unique coupon code (e.g. SAVE10)
  createdBy: string; // User ID of creator
  discountType: 'PERCENT' | 'FLAT'; // Type of discount
  discountValue: number; // % or amount
  minPurchase?: number; // Minimum purchase required
  maxDiscount?: number; // Cap for % discount
  usageLimit?: number; // Total allowed uses
  usedCount?: number; // How many times used
  validFrom?: Date; // Optional start date
  expiresAt?: Date; // Expiration date
  applicableCategories?: string[]; // e.g. ['food', 'grocery']
  isActive: boolean; // Status
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
