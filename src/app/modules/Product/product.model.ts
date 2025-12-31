/* eslint-disable @typescript-eslint/no-explicit-any */
import { model, Schema } from 'mongoose';
import { TProduct } from './product.interface';

const variationSchema = new Schema(
  {
    name: { type: String, required: true }, // e.g., "Size"
    options: [
      {
        label: { type: String, required: true }, // e.g., "Large"
        price: { type: Number, required: true }, // e.g., 500
        sku: { type: String },
      },
    ],
  },
  { _id: false }
);

const productSchema = new Schema<TProduct>(
  {
    productId: { type: String, required: true, unique: true },
    vendorId: { type: Schema.Types.ObjectId, required: true, ref: 'Vendor' },
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    isDeleted: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
    approvedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    remarks: { type: String },

    category: { type: String, required: true },
    subCategory: { type: String },
    brand: { type: String },

    variations: [variationSchema],
    addonGroups: [{ type: Schema.Types.ObjectId, ref: 'AddonGroup' }],

    pricing: {
      price: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      taxRate: { type: Number, default: 0 },
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
  { timestamps: true }
);

productSchema.pre('save', function (next) {
  const price = this.pricing?.price || 0;
  const discount = this.pricing?.discount || 0;
  const discountedPrice = price - (price * discount) / 100;

  this.pricing.finalPrice = parseFloat(discountedPrice.toFixed(2));
  next();
});

productSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() as any;
  const pricing =
    update?.pricing || update['pricing.price'] || update['pricing.discount'];
  if (pricing) {
    const currentDoc = (await this.model
      .findOne(this.getQuery())
      .lean()) as TProduct | null;
    if (!currentDoc) return next();

    const price =
      update.pricing?.price ??
      update['pricing.price'] ??
      currentDoc.pricing.price ??
      0;
    const discount =
      update.pricing?.discount ??
      update['pricing.discount'] ??
      currentDoc.pricing.discount ??
      0;

    const discountedPrice = price - (price * discount) / 100;

    if (update.pricing) {
      update.pricing.finalPrice = parseFloat(discountedPrice.toFixed(2));
    } else {
      update['pricing.finalPrice'] = parseFloat(discountedPrice.toFixed(2));
    }
  }
  next();
});

export const Product = model<TProduct>('Product', productSchema);
