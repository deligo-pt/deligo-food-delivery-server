import mongoose from 'mongoose';

export type TProduct = {
  _id?: string;
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

  pricing: {
    price: number;
    discount?: number;
    tax?: number;
    finalPrice: number;
    currency: string;
  };

  stock: {
    quantity: number;
    unit: string;
    availabilityStatus: 'In Stock' | 'Out of Stock' | 'Limited';
  };

  images: string[];

  // vendor: {
  //   // vendorName: string;
  //   // vendorType: string;
  //   // storePhoto: string;
  //   // longitude: number;
  //   // latitude: number;
  //   // rating?: number;
  // };

  tags?: string[];
  attributes?: Record<string, string | number | boolean | string[] | null>;

  rating?: {
    average: number;
    totalReviews: number;
  };

  meta: {
    isFeatured?: boolean;
    isAvailableForPreOrder?: boolean;
    status: 'Active' | 'Inactive';
    origin?: string;
    createdAt: Date;
    updatedAt: Date;
  };
};
