import { model, Schema } from 'mongoose';
import { TCart } from './cart.interface';

const cartAddonSchema = new Schema(
  {
    optionId: { type: String, required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    originalPrice: { type: Number, required: true },
    promoDiscountAmount: { type: Number, default: 0 },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    perUnitTaxAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
  },
  { _id: false },
);

const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
    vendorId: { type: Schema.Types.ObjectId, required: true, ref: 'Vendor' },
    name: { type: String, required: true }, // Snapshot of product name
    image: { type: String }, // Snapshot of product image
    hasVariations: { type: Boolean, default: false },
    variationSku: { type: String, default: null },
    isActive: { type: Boolean, default: true },

    addons: [cartAddonSchema],

    productPricing: {
      type: {
        originalPrice: { type: Number, required: true },
        productDiscountAmount: { type: Number, default: 0 },
        priceAfterProductDiscount: { type: Number, required: true },
        promoDiscountAmount: { type: Number, default: 0 },
        unitPrice: { type: Number, required: true },
        lineTotal: { type: Number, required: true },
        taxRate: { type: Number, default: 0 },
        perUnitTaxAmount: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
      },
      _id: false,
    },

    itemSummary: {
      type: {
        quantity: { type: Number, required: true, min: 1 },
        totalBeforeTax: { type: Number, required: true },
        totalTaxAmount: { type: Number, required: true },
        totalPromoDiscount: { type: Number, default: 0 },
        totalProductDiscount: { type: Number, default: 0 },
        grandTotal: { type: Number, required: true },
      },
      _id: false,
    },
  },
  { _id: false },
);

const cartSchema = new Schema<TCart>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Customer',
    },
    items: { type: [cartItemSchema], required: true, default: [] },

    totalItems: { type: Number, default: 0 },

    cartCalculation: {
      type: {
        totalOriginalPrice: { type: Number, default: 0 },
        totalProductDiscount: { type: Number, default: 0 },
        taxableAmount: { type: Number, default: 0 },
        totalTaxAmount: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 },
      },
      _id: false,
    },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Cart = model<TCart>('Cart', cartSchema);
