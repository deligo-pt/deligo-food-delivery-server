import { Schema, model } from 'mongoose';
import { TCheckoutSummary } from './checkout.interface';

const CheckoutSummarySchema = new Schema<TCheckoutSummary>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Customer',
    },
    vendorId: { type: Schema.Types.ObjectId, required: true, ref: 'Vendor' },
    customerEmail: { type: String, default: '' },
    contactNumber: { type: String, default: '' },

    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
        vendorId: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: 'Vendor',
        },
        name: { type: String, required: true },
        image: { type: String },
        hasVariations: { type: Boolean, required: true },
        variationSku: { type: String, default: null },
        addons: [
          {
            optionId: { type: String },
            name: { type: String },
            price: { type: Number },
            quantity: { type: Number },
            taxRate: { type: Number },
            taxAmount: { type: Number },
          },
        ],
        quantity: { type: Number, required: true },
        originalPrice: { type: Number, required: true },
        discountAmount: { type: Number, default: 0 },
        price: { type: Number, required: true },

        productTotalBeforeTax: { type: Number, required: true },
        productTaxAmount: { type: Number, required: true },
        totalBeforeTax: { type: Number, required: true },

        taxRate: { type: Number, required: true },
        taxAmount: { type: Number, required: true },
        subtotal: { type: Number, required: true },

        commissionRate: { type: Number, required: true },
        commissionAmount: { type: Number, required: true },
        commissionVatRate: { type: Number, required: true },
        commissionVatAmount: { type: Number, required: true },
        vendorNetEarnings: { type: Number, required: true },
      },
    ],

    totalItems: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    taxAmount: { type: Number, required: true },

    deliveryCharge: { type: Number, required: true },
    deliveryVatRate: { type: Number, required: true },
    deliveryVatAmount: { type: Number, required: true, default: 0 },
    totalDeliveryCharge: { type: Number, required: true, default: 0 },

    offerDiscount: { type: Number, default: 0 },
    totalProductDiscount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },

    promoType: {
      type: String,
      enum: ['OFFER', 'NONE'],
      default: 'NONE',
    },
    offerId: { type: Schema.Types.ObjectId, default: null, ref: 'Offer' },

    deliGoCommissionRate: { type: Number, required: true, default: 0 },
    deliGoCommission: { type: Number, required: true, default: 0 },
    commissionVat: { type: Number, required: true, default: 0 }, // VAT on Commission
    deliGoCommissionNet: { type: Number, required: true, default: 0 }, // Net Commission
    totalVendorDeduction: { type: Number, required: true, default: 0 },

    vendorNetPayout: { type: Number, required: true, default: 0 },

    fleetCommissionRate: { type: Number, required: true, default: 0 },
    fleetFee: { type: Number, required: true, default: 0 },
    riderNetEarnings: { type: Number, required: true, default: 0 },

    offerApplied: {
      promoId: {
        type: Schema.Types.ObjectId,
      },
      title: { type: String },
      promoType: { type: String, enum: ['OFFER', 'NONE'] },
      discountType: { type: String },
      discountValue: { type: Number },
      maxDiscountAmount: { type: Number },
      code: { type: String },
      bogoSnapshot: {
        buyQty: { type: Number },
        getQty: { type: Number },
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        productName: { type: String },
      },
    },

    deliveryAddress: {
      label: { type: String },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      country: { type: String },
      postalCode: { type: String },
      longitude: { type: Number, required: true },
      latitude: { type: Number, required: true },
      geoAccuracy: { type: Number },
      detailedAddress: {
        type: String,
      },
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
  { timestamps: true },
);
CheckoutSummarySchema.index({ customerId: 1, isConvertedToOrder: 1 });
export const CheckoutSummary = model<TCheckoutSummary>(
  'CheckoutSummary',
  CheckoutSummarySchema,
);
