import { Schema, model } from 'mongoose';
import { TCheckoutSummary } from './checkout.interface';

const CheckoutSummarySchema = new Schema<TCheckoutSummary>(
  {
    customerId: { type: String, required: true },
    customerEmail: { type: String, required: true },
    vendorId: { type: String, required: true },

    items: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        subtotal: { type: Number, required: true },
        vendorId: { type: String, required: true },
        estimatedDeliveryTime: { type: String, default: 'N/A' },
      },
    ],

    totalItems: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    estimatedDeliveryTime: { type: String, default: 'N/A' },
    couponCode: { type: String, default: undefined },

    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
      longitude: Number,
      latitude: Number,
      geoAccuracy: Number,
      isActive: Boolean,
      _id: String,
    },

    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED'],
      default: 'PENDING',
    },

    paymentMethod: {
      type: String,
      enum: ['CARD', 'MOBILE'],
    },

    transactionId: { type: String, default: undefined },

    orderId: { type: String, default: undefined },

    isConvertedToOrder: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CheckoutSummary = model<TCheckoutSummary>(
  'CheckoutSummary',
  CheckoutSummarySchema
);
