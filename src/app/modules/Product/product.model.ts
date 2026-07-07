/* eslint-disable @typescript-eslint/no-explicit-any */
import { model, Schema } from 'mongoose';
import { TProduct } from './product.interface';
import { roundTo2 } from '../../utils/mathProvider';
import { localizedSchema } from '../../constant/GlobalModel/language.model';

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
      price: {
        type: Number,
        required: function () {
          return !this.variations || this.variations.length === 0;
        },
      },
      discount: { type: Number, default: 0 },
      discountType: {
        type: String,
        enum: ['PERCENTAGE', 'FLAT'],
        default: 'PERCENTAGE',
      },
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
    id: false,
  },
);

productSchema.virtual('pricing.finalPrice').get(function () {
  const vendorPrice = this.pricing?.price || 0;
  const discountVal = this.pricing?.discount || 0;
  const discountType = this.pricing?.discountType || 'PERCENTAGE';

  let discountAmount = 0;
  if (discountType === 'PERCENTAGE') {
    discountAmount = roundTo2((vendorPrice * discountVal) / 100);
  } else {
    discountAmount = discountVal;
  }

  return roundTo2(Math.max(0, vendorPrice - discountAmount));
});

productSchema.virtual('pricing.discountAmount').get(function () {
  const vendorPrice = this.pricing?.price || 0;
  const discountVal = this.pricing?.discount || 0;
  const discountType = this.pricing?.discountType || 'PERCENTAGE';

  let computedDiscount = 0;
  if (discountType === 'PERCENTAGE') {
    computedDiscount = roundTo2((vendorPrice * discountVal) / 100);
  } else {
    computedDiscount = discountVal;
  }

  return roundTo2(Math.min(vendorPrice, computedDiscount));
});

productSchema.virtual('pricing.taxAmount').get(function () {
  const finalPrice = this.get('pricing.finalPrice') || 0;
  const taxRate = this.pricing?.taxRate || 0;

  return roundTo2(finalPrice * (taxRate / 100));
});

productSchema.virtual('pricing.basePrice').get(function () {
  const finalPrice = this.get('pricing.finalPrice') || 0;
  const taxAmount = this.get('pricing.taxAmount') || 0;

  return roundTo2(finalPrice - taxAmount);
});

export const Product = model<TProduct>('Product', productSchema);
