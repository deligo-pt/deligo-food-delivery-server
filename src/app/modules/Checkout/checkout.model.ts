import { Schema, model } from 'mongoose';
import { TCheckoutSummary } from './checkout.interface';
import { localizedSchema } from '../../constant/GlobalModel/language.model';

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
        name: { type: localizedSchema },
        image: { type: String },
        hasVariations: { type: Boolean, required: true },
        variationSku: { type: String, default: null },
        addons: [
          {
            name: { type: localizedSchema },
            sku: { type: String },
            originalPrice: { type: Number, required: true, min: 0 },
            promoDiscountAmount: { type: Number, default: 0 },
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
            discountType: {
              type: String,
              enum: ['PERCENTAGE', 'FLAT'],
              required: true,
            },
            priceAfterProductDiscount: { type: Number, required: true, min: 0 },
            promoDiscountAmount: { type: Number, default: 0 },
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
            totalTaxAmount: { type: Number, required: true },
            totalPromoDiscount: { type: Number, default: 0 },
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
    totalQuantity: { type: Number, required: true },

    orderCalculation: {
      type: {
        totalOriginalPrice: { type: Number, required: true },
        totalProductDiscount: { type: Number, default: 0 },
        totalOfferDiscount: { type: Number, default: 0 },
        totalTaxAmount: { type: Number, required: true },
        itemsSubtotal: { type: Number, required: true },
        serviceCharge: { type: Number, required: true },
        serviceChargeVatRate: { type: Number, default: 23 },
        serviceChargeVatAmount: { type: Number, default: 0 },
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
        estimatedTime: { type: Number, required: true },
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
          earnedServiceCharge: { type: Number, required: true }, // Base Platform fee collected
          serviceChargeVatAmount: { type: Number, required: true }, // VAT on Platform fee (23%)

          deliveryVatAmount: { type: Number, required: true }, // VAT on Delivery (Rider base stays with rider)

          totalPlatformNetRevenue: { type: Number, required: true }, // base commission + base service charge
          totalPlatformPayableTax: { type: Number, required: true }, // commission vat + service charge vat + delivery vat
          totalPlatformGrossHolding: { type: Number, required: true }, // total money kept by deligo before tax payout
        },
        fleet: {
          rate: { type: Number, required: true },
          fee: { type: Number, required: true },
        },
        vendor: {
          vendorNetPayout: { type: Number, required: true },
        },
        rider: {
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
