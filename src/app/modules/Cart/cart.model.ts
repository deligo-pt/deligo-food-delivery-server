import { model, Schema } from 'mongoose';
import { TCart } from './cart.interface';

const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
    vendorId: { type: Schema.Types.ObjectId, required: true, ref: 'Vendor' },
    name: { type: String, required: true }, // Snapshot of product name
    image: { type: String }, // Snapshot of product image
    variantName: { type: String }, // e.g., "Large" or "1:2"
    addons: [
      {
        name: { type: String },
        price: { type: Number },
        quantity: { type: Number },
      },
    ],
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity cannot be less than 1'],
    },
    price: { type: Number, required: true }, // Base Price + Variant Price
    subtotal: { type: Number, required: true }, // (Price * Quantity) + Addons total
    taxRate: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
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
    discount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },

    couponId: { type: Schema.Types.ObjectId, default: null, ref: 'Coupon' },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Pre-save hook updated with 'const' and clean logic
cartSchema.pre('save', function (next) {
  const activeItems = this.items.filter((item) => item.isActive === true);

  if (activeItems.length === 0) {
    this.totalItems = 0;
    this.totalPrice = 0;
    this.taxAmount = 0;
    this.subtotal = 0;
    return next();
  }

  // Calculations
  const calculatedTotalItems = activeItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const calculatedTotalPrice = activeItems.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );

  const calculatedTaxAmount = activeItems.reduce((sum, item) => {
    const itemTax = item.subtotal * ((item.taxRate || 0) / 100);
    return sum + itemTax;
  }, 0);

  const currentDiscount = this.discount || 0;

  const finalPayableAmount =
    calculatedTotalPrice + calculatedTaxAmount - currentDiscount;

  this.totalItems = calculatedTotalItems;
  this.totalPrice = Number(calculatedTotalPrice.toFixed(2));
  this.taxAmount = Number(calculatedTaxAmount.toFixed(2));
  this.subtotal =
    finalPayableAmount > 0 ? Number(finalPayableAmount.toFixed(2)) : 0;

  next();
});

export const Cart = model<TCart>('Cart', cartSchema);
