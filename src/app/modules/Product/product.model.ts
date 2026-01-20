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
        stockQuantity: { type: Number, default: 0 },
        totalAddedQuantity: { type: Number, default: 0 },
        isOutOfStock: { type: Boolean, default: false },
      },
    ],
  },
  { _id: false },
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
  return Number(discountedBase.toFixed(2));
});

productSchema.virtual('pricing.taxAmount').get(function () {
  const netPriceAfterDiscount = getNetPriceAfterDiscount(
    this.pricing.price,
    this.pricing.discount || 0,
  );
  const tax = netPriceAfterDiscount * (this.pricing.taxRate / 100);
  return Number(tax.toFixed(2));
});

productSchema.virtual('pricing.finalPrice').get(function () {
  const netPriceAfterDiscount = getNetPriceAfterDiscount(
    this.pricing.price,
    this.pricing.discount || 0,
  );
  const tax = netPriceAfterDiscount * (this.pricing.taxRate / 100);
  return Number((netPriceAfterDiscount + tax).toFixed(2));
});

// const calculateFinalPrice = (price: number, discount: number) => {
//   const discountedPrice = price - (price * discount) / 100;
//   return parseFloat(discountedPrice.toFixed(2));
// };

// productSchema.pre('save', function (next) {
//   if (this.variations && this.variations.length > 0) {
//     let minPrice = Infinity;
//     this.variations.forEach((v) => {
//       v.options.forEach((o) => {
//         if (o.price < minPrice) minPrice = o.price;
//       });
//     });

//     if (minPrice !== Infinity) {
//       this.pricing.price = minPrice;
//     }
//   }

//   this.pricing.finalPrice = calculateFinalPrice(
//     this.pricing.price,
//     this.pricing.discount || 0,
//   );

//   this.stock.availabilityStatus =
//     this.stock.quantity > 0 ? 'In Stock' : 'Out of Stock';

//   next();
// });

// productSchema.pre('findOneAndUpdate', async function (next) {
//   const update = this.getUpdate() as any;

//   const isPricingUpdate =
//     update?.pricing || update['pricing.price'] || update['pricing.discount'];
//   const isVariationUpdate = update?.variations;

//   if (isPricingUpdate || isVariationUpdate) {
//     const currentDoc = (await this.model
//       .findOne(this.getQuery())
//       .lean()) as TProduct | null;
//     if (!currentDoc) return next();

//     let price =
//       update['pricing.price'] ??
//       update.pricing?.price ??
//       currentDoc.pricing.price ??
//       0;

//     if (isVariationUpdate && update.variations.length > 0) {
//       let minPrice = Infinity;
//       update.variations.forEach((v: any) => {
//         v.options.forEach((o: any) => {
//           if (o.price > 0 && o.price < minPrice) minPrice = o.price;
//         });
//       });
//       if (minPrice !== Infinity) price = minPrice;
//     }

//     const discount =
//       update['pricing.discount'] ??
//       update.pricing?.discount ??
//       currentDoc.pricing.discount ??
//       0;

//     const discountedPrice = price - (price * discount) / 100;
//     const finalPrice = parseFloat(discountedPrice.toFixed(2));

//     if (update.pricing) {
//       update.pricing.price = price;
//       update.pricing.finalPrice = finalPrice;
//     } else {
//       update['pricing.price'] = price;
//       update['pricing.finalPrice'] = finalPrice;
//     }
//   }
//   next();
// });

export const Product = model<TProduct>('Product', productSchema);
