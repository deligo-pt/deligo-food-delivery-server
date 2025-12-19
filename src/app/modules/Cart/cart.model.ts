import { model, Schema } from 'mongoose';
import { TCart } from './cart.interface';

const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
    vendorId: { type: Schema.Types.ObjectId, required: true, ref: 'Vendor' },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    subtotal: { type: Number, required: true },
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
    subtotal: { type: Number, default: 0 },

    couponId: { type: Schema.Types.ObjectId, default: null, ref: 'Coupon' },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Pre-save hook to update totalItems and totalPrice
cartSchema.pre('save', function (next) {
  const activeItems = this.items.filter((item) => item.isActive === true);

  if (activeItems.length === 0) {
    this.totalItems = 0;
    this.totalPrice = 0;
    this.subtotal = 0;
    return next();
  }

  this.totalItems = activeItems.reduce((sum, item) => sum + item.quantity, 0);

  this.totalPrice = activeItems.reduce((sum, item) => sum + item.subtotal, 0);
  let subtotal = this.totalPrice;

  // Apply discount if exists
  if (this.discount && this.discount > 0) {
    subtotal = subtotal - this.discount;
  }

  // Final price
  this.totalPrice = parseFloat(this.totalPrice.toFixed(2));
  this.subtotal = parseFloat(subtotal.toFixed(2));

  next();
});

export const Cart = model<TCart>('Cart', cartSchema);
