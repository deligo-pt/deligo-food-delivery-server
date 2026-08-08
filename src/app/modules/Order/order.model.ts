import { model, Schema } from 'mongoose';
import {
  TOrder,
  TInvoiceSync,
  TOrderStatusHistory,
  TOrderPickup,
} from './order.interface';
import { FULFILLMENT_TYPE, ORDER_STATUS, REFUND_STATUS } from './order.constant';
import { addressSchema } from '../../constant/GlobalModel/address.model';
import { localizedSchema } from '../../constant/GlobalModel/language.model';
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from '../../constant/GlobalInterface/payment.interface';

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

const statusHistorySchema = new Schema<TOrderStatusHistory>(
  {
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    note: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);

const pickupSchema = new Schema<TOrderPickup>(
  {
    codeHash: { type: String, required: true, select: false },
    generatedAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    readyAt: { type: Date, default: null },
  },
  { _id: false },
);

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    name: { type: localizedSchema },
    image: { type: String },
    hasVariations: { type: Boolean, required: true },
    variationSku: { type: String, default: null },
    addons: [
      {
        name: { type: localizedSchema },
        sku: { type: String, required: true },
        originalPrice: { type: Number, required: true },
        promoDiscountAmount: { type: Number, default: 0 },
        unitPrice: { type: Number, required: true },
        quantity: { type: Number, required: true },
        lineTotal: { type: Number, required: true },
        taxRate: { type: Number, required: true },
        taxAmount: { type: Number, required: true },
      },
      { _id: false },
    ],

    productPricing: {
      originalPrice: { type: Number, required: true },
      productDiscountAmount: { type: Number, default: 0 },
      discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'] },
      priceAfterProductDiscount: { type: Number, required: true },
      promoDiscountAmount: { type: Number, default: 0 },
      unitPrice: { type: Number, required: true },
      lineTotal: { type: Number, required: true },
      taxRate: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
    },

    itemSummary: {
      quantity: { type: Number, required: true },
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
    vendor: {
      vendorEarningsWithoutTax: { type: Number, required: true },
      payableTax: { type: Number, required: true },
      vendorNetEarnings: { type: Number, required: true },
    },
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

    fulfillmentType: {
      type: String,
      enum: Object.values(FULFILLMENT_TYPE),
      required: true,
      default: FULFILLMENT_TYPE.DELIVERY,
    },
    pickup: { type: pickupSchema, default: undefined },

    items: { type: [orderItemSchema], required: true },

    totalItems: { type: Number, required: true },
    totalQuantity: { type: Number, required: true },

    orderCalculation: {
      totalOriginalPrice: { type: Number, required: true },
      totalProductDiscount: { type: Number, default: 0 },
      totalOfferDiscount: { type: Number, default: 0 },
      totalTaxAmount: { type: Number, required: true },
      itemsSubtotal: { type: Number, required: true },
      serviceCharge: { type: Number, required: true },
      serviceChargeVatRate: { type: Number, default: 23 },
      serviceChargeVatAmount: { type: Number, default: 0 },
    },

    delivery: {
      charge: { type: Number, required: true },
      vatRate: { type: Number, default: 23 },
      vatAmount: { type: Number, default: 0 },
      totalDeliveryCharge: { type: Number, required: true },
      distance: { type: Number, default: 0 },
      estimatedTime: { type: Number },
      deliveryProofImage: { type: String },
      notes: { type: String },
    },

    payoutSummary: {
      grandTotal: { type: Number, required: true },
      deliGoCommission: {
        rate: { type: Number, required: true },
        amount: { type: Number, required: true },
        vatAmount: { type: Number, required: true },
        totalDeduction: { type: Number, required: true },
        earnedServiceCharge: { type: Number, required: true },
        serviceChargeVatAmount: { type: Number, required: true },
        deliveryVatAmount: { type: Number, required: true },

        totalPlatformNetRevenue: { type: Number, required: true }, // base commission + base service charge
        totalPlatformPayableTax: { type: Number, required: true }, // commission vat + service charge vat + delivery vat
        totalPlatformGrossHolding: { type: Number, required: true }, // central cash reserve pool before merchant split
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
        riderNetEarnings: { type: Number, required: true },
      },
    },

    offer: {
      isApplied: { type: Boolean, default: false },
      offerApplied: { type: Schema.Types.Mixed, default: null },
    },

    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    transactionId: { type: String, unique: true, sparse: true },
    isPaid: { type: Boolean, default: false },

    orderStatus: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: 'PENDING',
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    cancelReason: { type: String },
    rejectReason: { type: String },
    refundStatus: {
      type: String,
      enum: Object.values(REFUND_STATUS),
      default: REFUND_STATUS.NOT_APPLICABLE,
    },
    remarks: { type: String, default: '' },

    dispatchPartnerPool: { type: [String], default: [] },
    dispatchExpiresAt: { type: Date },

    deliveryAddress: {
      type: addressSchema,
      // Without this, Mongoose auto-instantiates an empty subdocument for
      // PICKUP orders (single-nested-subdoc default behavior) instead of
      // leaving the path genuinely absent.
      default: undefined,
      required: [
        function requiresDeliveryAddress() {
          return (
            (this as unknown as TOrder).fulfillmentType ===
            FULFILLMENT_TYPE.DELIVERY
          );
        },
        'deliveryAddress is required for DELIVERY orders',
      ],
    },
    pickupAddress: { type: addressSchema },

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

// Indexes
// dispatchPartnerPool/dispatchExpiresAt are only ever populated while
// orderStatus === DISPATCHING (see broadcastOrderToPartners), so scope both
// indexes to that status to keep them tiny instead of covering every
// DELIVERED/CANCELED order forever.
orderSchema.index(
  {
    orderStatus: 1,
    deliveryPartnerId: 1,
    dispatchPartnerPool: 1,
  },
  { partialFilterExpression: { orderStatus: 'DISPATCHING' } },
);

orderSchema.index({ customerId: 1, createdAt: -1 });

orderSchema.index({
  vendorId: 1,
  'items.productId': 1,
});

orderSchema.index(
  { orderStatus: 1, dispatchExpiresAt: 1 },
  { partialFilterExpression: { orderStatus: 'DISPATCHING' } },
);
orderSchema.index({ deliveryPartnerId: 1, orderStatus: 1, createdAt: -1 });
orderSchema.index({ fulfillmentType: 1, orderStatus: 1, 'pickup.readyAt': 1 });
orderSchema.index({ 'items.productId': 1 });
orderSchema.index({ createdAt: -1 });

export const Order = model<TOrder>('Order', orderSchema);
