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
            sku: { type: String },
            originalPrice: { type: Number, required: true, min: 0 },
            promoDiscountAmount: { type: Number, required: true, min: 0 },
            unitPrice: { type: Number, required: true, min: 0 },
            quantity: { type: Number, required: true, min: 1 },
            lineTotal: { type: Number, required: true, min: 0 },
            taxRate: { type: Number, required: true, min: 0 },
            taxAmount: { type: Number, required: true, min: 0 },
          },
          { _id: false },
        ],

        productPricing: {
          type: {
            originalPrice: { type: Number, required: true, min: 0 },
            productDiscountAmount: { type: Number, required: true, min: 0 },
            priceAfterProductDiscount: { type: Number, required: true, min: 0 },
            promoDiscountAmount: { type: Number, required: true, min: 0 },
            unitPrice: { type: Number, required: true, min: 0 },
            lineTotal: { type: Number, required: true, min: 0 },
            taxRate: { type: Number, required: true, min: 0 },
            taxAmount: { type: Number, required: true, min: 0 },
          },
          _id: false,
        },

        itemSummary: {
          type: {
            quantity: { type: Number, required: true },
            totalBeforeTax: { type: Number, required: true },
            totalTaxAmount: { type: Number, required: true },
            totalPromoDiscount: { type: Number, required: true },
            totalProductDiscount: { type: Number, required: true },
            grandTotal: { type: Number, required: true },
          },
          _id: false,
        },
        commission: {
          type: {
            deliGoCommissionRate: { type: Number, required: true },
            deliGoCommissionAmount: { type: Number, required: true },
            deliGoCommissionVatRate: { type: Number, required: true },
            deliGoCommissionVatAmount: { type: Number, required: true },
          },
          _id: false,
        },
        vendor: {
          vendorEarningsWithoutTax: { type: Number, required: true },
          payableTax: { type: Number, required: true },
          vendorNetEarnings: { type: Number, required: true },
        },
        _id: false,
      },
    ],

    totalItems: { type: Number, required: true },

    orderCalculation: {
      type: {
        totalOriginalPrice: { type: Number, required: true },
        totalProductDiscount: { type: Number, default: 0 },
        totalOfferDiscount: { type: Number, default: 0 },
        taxableAmount: { type: Number, required: true },
        totalTaxAmount: { type: Number, required: true },
      },
      _id: false,
    },

    delivery: {
      type: {
        charge: { type: Number, required: true },
        vatRate: { type: Number, required: true },
        vatAmount: { type: Number, required: true },
        totalDeliveryCharge: { type: Number, required: true },
        distance: { type: Number, required: true },
        estimatedTime: { type: Number },
      },
      _id: false,
    },

    payoutSummary: {
      type: {
        grandTotal: { type: Number, required: true },
        deliGoCommission: {
          rate: { type: Number, required: true },
          amount: { type: Number, required: true },
          vatAmount: { type: Number, required: true },
          totalDeduction: { type: Number, required: true },
        },
        fleet: {
          rate: { type: Number, required: true },
          fee: { type: Number, required: true },
        },
        vendor: {
          earningsWithoutTax: { type: Number, required: true },
          payableTax: { type: Number, required: true },
          vendorNetPayout: { type: Number, required: true },
        },
        rider: {
          earningsWithoutTax: { type: Number, required: true },
          payableTax: { type: Number, required: true },
          riderNetEarnings: { type: Number, required: true },
        },
      },
      _id: false,
    },
    offer: {
      type: {
        isApplied: { type: Boolean, required: true },
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
      },
      _id: false,
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

    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED'],
      default: 'PENDING',
    },

    paymentMethod: {
      type: String,
      enum: ['CARD', 'MB_WAY', 'APPLE_PAY', 'PAYPAL', 'GOOGLE_PAY', 'OTHER'],
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
