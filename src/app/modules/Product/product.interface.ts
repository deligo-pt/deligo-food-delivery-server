import mongoose from 'mongoose';

export type TLocalizedText = {
  en: string; // English
  pt: string; // Portuguese
};

export type TProduct = {
  _id: mongoose.Types.ObjectId;
  productId: string;
  vendorId: mongoose.Types.ObjectId;
  sku: string;

  name: TLocalizedText;
  slug: string;
  description: TLocalizedText;

  isDeleted: boolean;
  isApproved: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  remarks?: string;

  category: mongoose.Types.ObjectId;
  subCategory?: string;
  brand?: string;

  variations?: {
    name: TLocalizedText;
    options: {
      label: TLocalizedText;
      price: number;
      sku: string;
      stockQuantity?: number;
      totalAddedQuantity?: number;
      isOutOfStock?: boolean;
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

  stock?: {
    quantity: number;
    totalAddedQuantity: number;
    unit: string;
    availabilityStatus: 'In Stock' | 'Out of Stock' | 'Limited';
    hasVariations: boolean;
  };

  images: string[];

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
