import { model, Schema } from 'mongoose';
import { TCart } from './cart.interface';

const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
    vendorId: { type: Schema.Types.ObjectId, required: true, ref: 'Vendor' },
    name: { type: String, required: true }, // Snapshot of product name
    image: { type: String }, // Snapshot of product image
    hasVariations: { type: Boolean, default: false },
    variationSku: { type: String, default: null },

    originalPrice: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    // ------------------------------------------

    price: { type: Number, required: true },

    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity cannot be less than 1'],
    },

    addons: [
      {
        optionId: {
          type: String,
        },
        name: { type: String },
        sku: { type: String },
        price: { type: Number },
        quantity: { type: Number },
        taxRate: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
      },
    ],

    productTotalBeforeTax: { type: Number, default: 0 },
    productTaxAmount: { type: Number, default: 0 },

    totalBeforeTax: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
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
    totalPrice: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },

    totalProductDiscount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Cart = model<TCart>('Cart', cartSchema);
