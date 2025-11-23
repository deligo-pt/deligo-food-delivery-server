import { Schema, model } from 'mongoose';
import { ICheckoutSummary } from './checkoutSummary.interface';

const CheckoutSummarySchema = new Schema<ICheckoutSummary>(
  {
    customerId: { type: String, required: true },
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

    discount: { type: Number, default: 0 },
    totalItems: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    estimatedDeliveryTime: { type: String, default: 'N/A' },

    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
      latitude: Number,
      longitude: Number,
      goAccuracy: Number,
      isActive: Boolean,
      _id: String,
    },

    isConvertedToOrder: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CheckoutSummary = model<ICheckoutSummary>(
  'CheckoutSummary',
  CheckoutSummarySchema
);
