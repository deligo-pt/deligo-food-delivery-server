/* eslint-disable @typescript-eslint/no-explicit-any */
import { model, Schema } from 'mongoose';
import { TProduct } from './product.interface';

const productSchema = new Schema<TProduct>(
  {
    productId: { type: String, required: true, unique: true },
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    test: {
      type: Number,
      default: 0,
    },
    description: { type: String },
    isDeleted: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
    remarks: { type: String },

    category: { type: String, required: true },
    subCategory: { type: String },
    brand: { type: String },

    pricing: {
      price: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      finalPrice: { type: Number },
      currency: { type: String, default: 'BDT' },
    },

    stock: {
      quantity: { type: Number, required: true },
      unit: { type: String },
      availabilityStatus: {
        type: String,
        enum: ['In Stock', 'Out of Stock', 'Limited'],
        default: 'In Stock',
      },
    },

    images: [{ type: String }],

    vendor: {
      vendorId: { type: String, required: true },
      vendorName: { type: String },
      vendorType: { type: String },
      rating: { type: Number },
    },

    tags: [{ type: String }],

    attributes: { type: Schema.Types.Mixed, default: {} },

    rating: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },

    meta: {
      isFeatured: { type: Boolean, default: false },
      isAvailableForPreOrder: { type: Boolean, default: false },
      status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
      origin: { type: String },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

productSchema.pre('save', function (next) {
  const price = this.pricing?.price || 0;
  const discount = this.pricing?.discount || 0;
  const tax = this.pricing?.tax || 0;
  const discountedPrice = price - (price * discount) / 100;
  const taxedPrice = discountedPrice + (discountedPrice * tax) / 100;
  this.pricing.finalPrice = parseFloat(taxedPrice.toFixed(2));
  next();
});

productSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;
  const pricing = update?.pricing;
  if (
    pricing?.price !== undefined ||
    pricing?.discount !== undefined ||
    pricing?.tax !== undefined
  ) {
    const price = pricing.price ?? 0;
    const discount = pricing.discount ?? 0;
    const tax = pricing.tax ?? 0;

    const discounted = price - (price * discount) / 100;
    const taxed = discounted + (discounted * tax) / 100;

    update['pricing.finalPrice'] = parseFloat(taxed.toFixed(2));
  }
  next();
});

export const Product = model<TProduct>('Product', productSchema);
