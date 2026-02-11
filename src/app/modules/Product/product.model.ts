/* eslint-disable @typescript-eslint/no-explicit-any */
import { model, Schema } from 'mongoose';
import { TProduct } from './product.interface';
import { roundTo4 } from '../../utils/mathProvider';

const variationSchema = new Schema({
  name: { type: String, required: true }, // e.g., "Size"
  options: [
    {
      _id: false,
      label: { type: String, required: true }, // e.g., "Large"
      price: { type: Number, required: true }, // e.g., 500
      sku: { type: String, unique: true },
      stockQuantity: { type: Number, default: 0 },
      totalAddedQuantity: { type: Number, default: 0 },
      isOutOfStock: { type: Boolean, default: false },
    },
  ],
});

const productSchema = new Schema<TProduct>(
  {
    productId: { type: String, required: true, unique: true },
    pdItemId: { type: String, default: null },
    vendorId: { type: Schema.Types.ObjectId, required: true, ref: 'Vendor' },
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    isDeleted: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
    approvedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    remarks: { type: String },

    category: {
      type: Schema.Types.ObjectId,
      ref: 'ProductCategory',
      required: true,
    },
    subCategory: { type: String },
    brand: { type: String },

    variations: [variationSchema],
    addonGroups: [{ type: Schema.Types.ObjectId, ref: 'AddonGroup' }],

    pricing: {
      price: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      taxId: {
        type: Schema.Types.ObjectId,
        ref: 'Tax',
        required: [true, 'Tax reference is required for each product'],
      },
      taxRate: { type: Number, default: 0 },
      currency: { type: String, default: 'EUR' },
    },

    stock: {
      quantity: { type: Number, required: true },
      totalAddedQuantity: { type: Number, default: 0 },
      unit: { type: String },
      availabilityStatus: {
        type: String,
        enum: ['In Stock', 'Out of Stock', 'Limited'],
        default: 'In Stock',
      },
      hasVariations: { type: Boolean, default: false },
    },

    images: [{ type: String }],

    tags: [{ type: String }],

    attributes: { type: Schema.Types.Mixed, default: {} },

    rating: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },

    meta: {
      isFeatured: { type: Boolean, default: false },
      isAvailableForPreOrder: { type: Boolean, default: false },
      status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
      origin: { type: String },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const getNetPriceAfterDiscount = (price: number, discount: number) => {
  return price - (price * discount) / 100;
};

productSchema.virtual('pricing.discountedBasePrice').get(function () {
  const price = this.pricing?.price || 0;
  const discountPercent = this.pricing?.discount || 0;
  const discountedBase = price - (price * discountPercent) / 100;
  return roundTo4(discountedBase);
});

productSchema.virtual('pricing.taxAmount').get(function () {
  const netPriceAfterDiscount = getNetPriceAfterDiscount(
    this.pricing.price,
    this.pricing.discount || 0,
  );
  const tax = netPriceAfterDiscount * (this.pricing.taxRate / 100);
  return roundTo4(tax);
});

productSchema.virtual('pricing.finalPrice').get(function () {
  const netPriceAfterDiscount = getNetPriceAfterDiscount(
    this.pricing.price,
    this.pricing.discount || 0,
  );
  const tax = netPriceAfterDiscount * (this.pricing.taxRate / 100);
  return roundTo4(netPriceAfterDiscount + tax);
});

export const Product = model<TProduct>('Product', productSchema);
