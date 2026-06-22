/* eslint-disable @typescript-eslint/no-explicit-any */
import { model, Schema } from 'mongoose';
import { TProduct } from './product.interface';
import { roundTo2 } from '../../utils/mathProvider';

const localizedSchema = new Schema(
  {
    en: { type: String, required: true },
    pt: { type: String, required: true },
  },
  { _id: false },
);

const variationSchema = new Schema({
  name: { type: localizedSchema, required: true },
  options: [
    {
      _id: false,
      label: { type: localizedSchema, required: true },
      price: { type: Number, required: true },
      sku: { type: String },
      stockQuantity: { type: Number },
      totalAddedQuantity: { type: Number },
      isOutOfStock: { type: Boolean },
    },
  ],
});

const productSchema = new Schema<TProduct>(
  {
    productId: { type: String, required: true, unique: true },
    vendorId: { type: Schema.Types.ObjectId, required: true, ref: 'Vendor' },
    sku: { type: String, required: true, unique: true },

    name: { type: localizedSchema, required: true },
    slug: { type: String, required: true },
    description: { type: localizedSchema, required: true },

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

    variations: {
      type: [variationSchema],
      default: undefined,
      required: false,
    },
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
      type: {
        quantity: { type: Number },
        totalAddedQuantity: { type: Number },
        unit: { type: String },
        availabilityStatus: {
          type: String,
          enum: ['In Stock', 'Out of Stock', 'Limited'],
          default: 'In Stock',
        },
        hasVariations: { type: Boolean, default: false },
      },
      required: false,
      default: undefined,
    },
    images: [{ type: String }],

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
  const discountedPrice = roundTo2((price * discount) / 100);
  const discountedBase = roundTo2(price - discountedPrice);
  return roundTo2(discountedBase);
};

productSchema.virtual('pricing.discountedBasePrice').get(function () {
  const price = this.pricing?.price || 0;
  const discountPercent = this.pricing?.discount || 0;
  const discountedPrice = roundTo2((price * discountPercent) / 100);
  const discountedBase = roundTo2(price - discountedPrice);
  return roundTo2(discountedBase);
});

productSchema.virtual('pricing.taxAmount').get(function () {
  const netPriceAfterDiscount = getNetPriceAfterDiscount(
    this.pricing.price,
    this.pricing.discount || 0,
  );
  const tax = roundTo2(netPriceAfterDiscount * (this.pricing.taxRate / 100));
  return tax;
});

productSchema.virtual('pricing.finalPrice').get(function () {
  const netPriceAfterDiscount = getNetPriceAfterDiscount(
    this.pricing.price,
    this.pricing.discount || 0,
  );
  const tax = roundTo2(netPriceAfterDiscount * (this.pricing.taxRate / 100));
  return roundTo2(netPriceAfterDiscount + tax);
});

export const Product = model<TProduct>('Product', productSchema);
