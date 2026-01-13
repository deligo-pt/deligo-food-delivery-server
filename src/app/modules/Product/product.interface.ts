import mongoose from 'mongoose';

export type TProduct = {
  _id: mongoose.Types.ObjectId;
  productId: string;
  vendorId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  slug: string;
  description: string;
  isDeleted: boolean;
  isApproved: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  remarks?: string;

  category: string;
  subCategory?: string;
  brand?: string;

  variations?: {
    name: string; // e.g., "Size"
    options: {
      label: string; // e.g., "Large"
      price: number; // e.g., 500
      sku?: string;
    }[];
  }[];

  addonGroups?: mongoose.Types.ObjectId[];

  pricing: {
    price: number;
    discount?: number;
    taxRate?: number;
    finalPrice?: number;
    currency: string;
  };

  stock: {
    quantity: number;
    unit: string;
    availabilityStatus: 'In Stock' | 'Out of Stock' | 'Limited';
  };

  images: string[];

  tags?: string[];
  attributes?: Record<string, string | number | boolean | string[] | null>;

  rating?: {
    average: number;
    totalReviews: number;
  };

  meta: {
    isFeatured?: boolean;
    isAvailableForPreOrder?: boolean;
    status: 'ACTIVE' | 'INACTIVE';
    origin?: string;
    createdAt: Date;
    updatedAt: Date;
  };
};
