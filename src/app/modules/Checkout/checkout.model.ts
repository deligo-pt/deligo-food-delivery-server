import { Schema, model } from 'mongoose';
import { TCheckoutSummary } from './checkout.interface';

const CheckoutSummarySchema = new Schema<TCheckoutSummary>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Customer',
    },
    customerEmail: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    vendorId: { type: Schema.Types.ObjectId, required: true, ref: 'Vendor' },

    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        subtotal: { type: Number, required: true },
        vendorId: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: 'Vendor',
        },
        estimatedDeliveryTime: { type: String, default: 'N/A' },
      },
    ],

    totalItems: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, required: true },
    subTotal: { type: Number, required: true },
    estimatedDeliveryTime: { type: String, default: 'N/A' },

    offerApplied: {
      offerId: {
        type: Schema.Types.ObjectId,
        ref: 'Offer',
      },
      title: { type: String },
      offerType: { type: String },
      discountValue: { type: Number },
      maxDiscountAmount: { type: Number },
      code: { type: String },
    },

    couponId: { type: Schema.Types.ObjectId, default: null, ref: 'Coupon' },

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

    orderId: { type: Schema.Types.ObjectId, default: null, ref: 'Order' },

    isConvertedToOrder: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CheckoutSummary = model<TCheckoutSummary>(
  'CheckoutSummary',
  CheckoutSummarySchema
);
