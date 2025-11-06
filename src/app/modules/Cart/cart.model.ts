import { model, Schema } from 'mongoose';
import { TCart } from './cart.interface';

const cartItemSchema = new Schema(
  {
    productId: { type: String, required: true, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const cartSchema = new Schema<TCart>(
  {
    customerId: {
      type: String,
      required: true,
      ref: 'Customer',
    },
    items: { type: [cartItemSchema], required: true, default: [] },

    totalItems: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },

    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Pre-save hook to update totalItems and totalPrice
cartSchema.pre('save', function (next) {
  if (!this.items || this.items.length === 0) {
    this.totalItems = 0;
    this.totalPrice = 0;
    return next();
  }

  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalPrice = this.items.reduce((sum, item) => sum + item.subtotal, 0);

  if (this.discount && this.discount > 0) {
    this.totalPrice = parseFloat(
      (this.totalPrice - (this.totalPrice * this.discount) / 100).toFixed(2)
    );
  }

  next();
});

export const Cart = model<TCart>('Cart', cartSchema);
