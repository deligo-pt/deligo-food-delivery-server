import { TBusinessTypes } from '../Vendor/vendor.constant';

export type TProduct = {
  // Basic Information
  productId: string; // Unique product identifier
  sku: string; // Unique Stock Keeping Unit (used for inventory tracking)
  name: string; // Product display name
  slug: string; // URL-friendly name for SEO
  description: string; // Detailed product information
  isDeleted: boolean; // Soft delete flag
  isApproved: boolean; // Approval status for listing

  // Categorization
  category: string; // Main category (e.g., "Food", "Grocery", "Electronics")
  subCategory?: string; // Optional subcategory
  brand?: string; // Brand name (if applicable)
  productType: 'food' | 'grocery' | 'pharmacy' | 'electronics' | 'others'; // Type classification

  // Pricing
  price: number; // Original price
  discount?: number; // Discount percentage or amount
  // tax: number; // Tax percentage (if applicable)
  finalPrice: number; // Price after discount
  currency: string; // Currency type (e.g., "BDT", "USD")

  // Stock Information
  stock: {
    quantity: number; // Available quantity
    unit: string; // e.g., "pcs", "kg", "L"
    availabilityStatus: 'In Stock' | 'Out of Stock' | 'Limited';
  };

  // Media & Images
  images: string[];

  // Vendor Information
  vendor: {
    vendorId: string;
    vendorName: string;
    vendorType: TBusinessTypes;
    rating?: number;
  };

  // Tags for search/filter optimization
  tags?: string[];

  // Delivery Details
  deliveryInfo?: {
    deliveryType: 'Instant' | 'Scheduled' | 'Pickup';
    estimatedTime?: string;
    deliveryCharge?: number;
    freeDeliveryAbove?: number;
  };

  // Nutritional Information
  nutritionalInfo?: {
    calories?: number;
    protein?: string;
    fat?: string;
    carbohydrates?: string;
  };

  // Additional Attributes
  attributes?: {
    color?: string;
    size?: string;
    flavor?: string;
    weight?: string;
    expiryDate?: string;
  };

  // Ratings
  rating?: {
    average?: number;
    totalReviews?: number;
  };

  // Metadata and Status
  meta: {
    isFeatured?: boolean;
    isAvailableForPreOrder?: boolean;
    status: 'Active' | 'Inactive';
    origin?: string;
    createdAt: Date;
    updatedAt: Date;
  };
};
