import mongoose from 'mongoose';

export type TProduct = {
  _id: mongoose.Types.ObjectId;
  productId: string;
  pdItemId?: string;
  vendorId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  slug: string;
  description: string;
  isDeleted: boolean;
  isApproved: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  remarks?: string;

  category: mongoose.Types.ObjectId;
  subCategory?: string;
  brand?: string;

  variations?: {
    name: string;
    options: {
      label: string;
      price: number;
      sku: string;
      pdItemId?: string;
      stockQuantity: number;
      totalAddedQuantity: number;
      isOutOfStock: boolean;
    }[];
  }[];

  addonGroups?: mongoose.Types.ObjectId[];

  pricing: {
    price: number;
    discount: number;
    taxId: mongoose.Types.ObjectId;
    taxRate: number;
    currency: string;
  };

  stock: {
    quantity: number;
    totalAddedQuantity: number;
    unit: string;
    availabilityStatus: 'In Stock' | 'Out of Stock' | 'Limited';
    hasVariations: boolean;
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
