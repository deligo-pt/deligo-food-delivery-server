export type TProduct = {
  _id?: string;
  productId: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  isDeleted: boolean;
  isApproved: boolean;
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

  vendor: {
    vendorId: string;
    vendorName: string;
    vendorType: string;
    rating?: number;
  };

  tags?: string[];

  deliveryInfo?: {
    deliveryType: 'Instant' | 'Scheduled' | 'Pickup';
    estimatedTime?: string;
    deliveryCharge?: number;
    freeDeliveryAbove?: number;
  };

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
