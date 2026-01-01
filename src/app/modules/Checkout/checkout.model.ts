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
        name: { type: String, required: true },
        image: { type: String },
        variantName: { type: String },
        addons: [
          {
            name: { type: String },
            price: { type: Number },
            quantity: { type: Number },
          },
        ],
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        taxRate: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        subtotal: { type: Number, required: true },
        vendorId: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: 'Vendor',
        },
      },
    ],

    totalItems: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    subTotal: { type: Number, required: true },

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
      label: { type: String },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: String,
      postalCode: String,
      longitude: { type: Number, required: true },
      latitude: { type: Number, required: true },
      geoAccuracy: Number,
    },

    estimatedDeliveryTime: { type: String, default: 'N/A' },

    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED'],
      default: 'PENDING',
    },

    paymentMethod: {
      type: String,
      enum: ['CARD', 'MOBILE'],
    },

    transactionId: { type: String, default: null },

    orderId: { type: Schema.Types.ObjectId, default: null, ref: 'Order' },

    isConvertedToOrder: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CheckoutSummary = model<TCheckoutSummary>(
  'CheckoutSummary',
  CheckoutSummarySchema
);
