import { model, Schema } from 'mongoose';
import { TProduct } from './product.interface';

const productSchema = new Schema<TProduct>(
  {
    // Basic Information
    productId: { type: String, required: true, unique: true },
    sku: { type: String, required: true, unique: true }, // Unique SKU for inventory tracking
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    isDeleted: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },

    // Categorization
    category: { type: String, required: true },
    subCategory: String,
    brand: String,
    productType: {
      type: String,
      enum: ['food', 'grocery', 'pharmacy', 'electronics', 'others'],
      required: true,
    },

    // Pricing
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },
    currency: { type: String, default: 'BDT' },

    // Stock Information
    stock: {
      quantity: { type: Number, required: true },
      unit: { type: String },
      availabilityStatus: {
        type: String,
        enum: ['In Stock', 'Out of Stock', 'Limited'],
        default: 'In Stock',
      },
    },

    // Images
    images: [String],

    // Vendor
    vendor: {
      vendorId: { type: String, required: true },
      vendorName: String,
      vendorType: { type: String },
      rating: Number,
    },

    // Tags
    tags: [String],

    // Delivery Info
    deliveryInfo: {
      deliveryType: String,
      estimatedTime: String,
      deliveryCharge: Number,
      freeDeliveryAbove: Number,
    },

    // Nutritional Info
    nutritionalInfo: {
      calories: Number,
      protein: String,
      fat: String,
      carbohydrates: String,
    },

    // Attributes
    attributes: {
      color: String,
      size: String,
      flavor: String,
      weight: String,
      expiryDate: String,
    },

    // Ratings
    rating: {
      average: Number,
      totalReviews: Number,
    },

    // Meta
    meta: {
      isFeatured: { type: Boolean, default: false },
      isAvailableForPreOrder: { type: Boolean, default: false },
      status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
      origin: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

// Export Model
export const Product = model<TProduct>('Product', productSchema);
