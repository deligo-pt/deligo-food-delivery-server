import { model, Schema } from 'mongoose';
import { TOrder, TInvoiceSync } from './order.interface';
import { ORDER_STATUS } from './order.constant';
import { addressSchema } from '../../constant/address.constant';

const invoiceSyncSchema = new Schema<TInvoiceSync>(
  {
    isSynced: { type: Boolean, default: false },
    invoiceNo: { type: String },
    atcud: { type: String },
    signature: { type: String },
    syncedAt: { type: Date },
    syncError: { type: String },
  },
  { _id: false },
);

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    name: { type: String, required: true },
    image: { type: String },
    hasVariations: { type: Boolean, required: true },
    variationSku: { type: String, default: null },
    addons: [
      {
        optionId: { type: String },
        name: { type: String },
        sku: { type: String },
        originalPrice: { type: Number },
        promoDiscountAmount: { type: Number, default: 0 },
        unitPrice: { type: Number },
        quantity: { type: Number },
        lineTotal: { type: Number },
        taxRate: { type: Number },
        taxAmount: { type: Number },
        _id: false,
      },
    ],

    productPricing: {
      originalPrice: { type: Number, required: true },
      productDiscountAmount: { type: Number, default: 0 },
      priceAfterProductDiscount: { type: Number, required: true },
      promoDiscountAmount: { type: Number, default: 0 },
      unitPrice: { type: Number, required: true },
      lineTotal: { type: Number, required: true },
      taxRate: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
    },

    itemSummary: {
      quantity: { type: Number, required: true },
      totalBeforeTax: { type: Number, required: true },
      totalTaxAmount: { type: Number, required: true },
      totalPromoDiscount: { type: Number, default: 0 },
      totalProductDiscount: { type: Number, default: 0 },
      grandTotal: { type: Number, required: true },
    },

    commission: {
      deliGoCommissionRate: { type: Number, required: true },
      deliGoCommissionAmount: { type: Number, required: true },
      deliGoCommissionVatRate: { type: Number, required: true },
      deliGoCommissionVatAmount: { type: Number, required: true },
    },
    vendorNetEarnings: { type: Number, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<TOrder>(
  {
    orderId: { type: String, required: true, unique: true },
    customerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Customer',
    },
    vendorId: { type: Schema.Types.ObjectId, required: true, ref: 'Vendor' },
    deliveryPartnerId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: 'DeliveryPartner',
    },
    deliveryPartnerCancelReason: { type: String, default: null },

    items: { type: [orderItemSchema], required: true },

    totalItems: { type: Number, required: true },

    orderCalculation: {
      totalOriginalPrice: { type: Number, required: true },
      totalProductDiscount: { type: Number, default: 0 },
      totalOfferDiscount: { type: Number, default: 0 },
      taxableAmount: { type: Number, required: true },
      totalTaxAmount: { type: Number, required: true },
    },

    delivery: {
      charge: { type: Number, required: true },
      vatRate: { type: Number, default: 0 },
      vatAmount: { type: Number, default: 0 },
      totalDeliveryCharge: { type: Number, required: true },
      distance: { type: Number, default: 0 },
      estimatedTime: { type: String },
    },

    payoutSummary: {
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
      vendorNetPayout: { type: Number, required: true },
      riderNetEarnings: { type: Number, required: true },
    },

    offer: {
      isApplied: { type: Boolean, default: false },
      offerApplied: { type: Object, default: null },
    },

    paymentMethod: {
      type: String,
      enum: ['CARD', 'MB_WAY', 'APPLE_PAY', 'OTHER'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    transactionId: { type: String },
    isPaid: { type: Boolean, default: false },

    orderStatus: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: 'PENDING',
    },
    cancelReason: { type: String },
    rejectReason: { type: String },
    remarks: { type: String, default: '' },

    deliveryOtp: { type: String },
    isOtpVerified: { type: Boolean, default: false },
    dispatchPartnerPool: { type: [String], default: [] },
    dispatchExpiresAt: { type: Date },

    deliveryAddress: { type: addressSchema, required: true },
    pickupAddress: { type: addressSchema },

    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    preparationTime: { type: Number, default: 0 },

    ratingStatus: {
      isProductRated: { type: Boolean, default: false },
      isVendorRated: { type: Boolean, default: false },
      isDeliveryRated: { type: Boolean, default: false },
    },

    isRated: { type: Boolean, default: false },
    invoiceSync: { type: invoiceSyncSchema, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// The "Dispatching" Engine (Critical for partnerAcceptsDispatchedOrder)
orderSchema.index({
  orderStatus: 1,
  deliveryPartnerId: 1,
  dispatchPartnerPool: 1,
});

// Customer History (Optimized for the "My Orders" tab)
orderSchema.index({ customerId: 1, createdAt: -1 });

// For top items aggregation
orderSchema.index({
  vendorId: 1,
  'items.productId': 1,
});

orderSchema.index({ orderStatus: 1, dispatchExpiresAt: 1 });

export const Order = model<TOrder>('Order', orderSchema);

// const orderItemSchema = new Schema(
//   {
//     productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
//     vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
//     name: { type: String, required: true },
//     image: { type: String },
//     hasVariations: { type: Boolean, required: true },
//     variationSku: { type: String, default: null },
//     addons: [
//       {
//         optionId: { type: String },
//         name: { type: String },
//         sku: { type: String },
//         price: { type: Number },
//         quantity: { type: Number },
//         taxRate: { type: Number },
//         taxAmount: { type: Number },
//       },
//     ],
//     quantity: { type: Number, required: true },

//     originalPrice: { type: Number },
//     discountAmount: { type: Number, default: 0 },
//     price: { type: Number, required: true },

//     productTotalBeforeTax: { type: Number },
//     productTaxAmount: { type: Number },
//     totalBeforeTax: { type: Number, required: true },

//     taxRate: { type: Number, default: 0 },
//     taxAmount: { type: Number, default: 0 },
//     subtotal: { type: Number, required: true },

//     commissionRate: { type: Number, required: true },
//     commissionAmount: { type: Number, required: true },
//     commissionVatRate: { type: Number, required: true },
//     commissionVatAmount: { type: Number, required: true },

//     vendorNetEarnings: { type: Number, required: true },
//   },
//   { _id: false },
// );

// const orderSchema = new Schema<TOrder>(
//   {
//     orderId: { type: String, required: true, unique: true },
//     customerId: {
//       type: Schema.Types.ObjectId,
//       required: true,
//       ref: 'Customer',
//     },
//     vendorId: { type: Schema.Types.ObjectId, required: true, ref: 'Vendor' },
//     deliveryPartnerId: {
//       type: Schema.Types.ObjectId,
//       default: null,
//       ref: 'DeliveryPartner',
//     },
//     deliveryPartnerCancelReason: { type: String, default: null },

//     items: { type: [orderItemSchema], required: true },

//     totalItems: { type: Number, required: true },
//     totalPrice: { type: Number, required: true },

//     totalProductDiscount: { type: Number, default: 0 },
//     totalOfferDiscount: { type: Number, default: 0 },

//     taxableAmount: { type: Number, default: 0 },
//     taxAmount: { type: Number, default: 0 },

//     deliveryCharge: { type: Number, default: 0 },
//     deliveryVatRate: { type: Number, default: 0 },
//     deliveryVatAmount: { type: Number, default: 0 },
//     totalDeliveryCharge: { type: Number, default: 0 },

//     subtotal: { type: Number, required: true },

//     deliGoCommissionRate: { type: Number },
//     deliGoCommission: { type: Number, required: true },
//     commissionVat: { type: Number, required: true },
//     deliGoCommissionNet: { type: Number, required: true },
//     totalVendorDeduction: { type: Number, required: true },

//     vendorNetPayout: { type: Number, required: true },

//     fleetCommissionRate: { type: Number },
//     fleetFee: { type: Number, required: true },
//     riderNetEarnings: { type: Number, required: true },

//     promoType: { type: String, enum: ['OFFER', 'NONE'], default: 'NONE' },
//     offerApplied: { type: Object, default: null },

//     paymentMethod: { type: String, enum: ['CARD', 'MB_WAY'], required: true },
//     paymentStatus: {
//       type: String,
//       enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
//       default: 'PENDING',
//     },
//     transactionId: { type: String },
//     isPaid: { type: Boolean, default: false },

//     orderStatus: {
//       type: String,
//       enum: Object.values(ORDER_STATUS),
//       default: 'PENDING',
//     },
//     cancelReason: { type: String },
//     rejectReason: { type: String },
//     remarks: { type: String, default: '' },

//     deliveryOtp: { type: String },
//     isOtpVerified: { type: Boolean, default: false },
//     dispatchPartnerPool: { type: [String], default: [] },
//     dispatchExpiresAt: { type: Date },

//     deliveryAddress: { type: addressSchema, required: true },
//     pickupAddress: { type: addressSchema },

//     deliveryDistance: {
//       type: Number,
//       default: 0,
//     },
//     estimatedDeliveryTime: { type: String },
//     pickedUpAt: { type: Date },
//     deliveredAt: { type: Date },
//     preparationTime: { type: Number, default: 0 },

//     ratingStatus: {
//       isProductRated: { type: Boolean, default: false },
//       isVendorRated: { type: Boolean, default: false },
//       isDeliveryRated: { type: Boolean, default: false },
//     },

//     isRated: { type: Boolean, default: false },
//     invoiceSync: { type: invoiceSyncSchema, default: null },
//     isDeleted: { type: Boolean, default: false },
//   },
//   { timestamps: true },
// );
