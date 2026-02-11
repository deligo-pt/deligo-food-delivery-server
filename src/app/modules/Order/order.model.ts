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
        price: { type: Number },
        quantity: { type: Number },
        taxRate: { type: Number },
        taxAmount: { type: Number },
      },
    ],
    quantity: { type: Number, required: true },

    originalPrice: { type: Number },
    discountAmount: { type: Number, default: 0 },
    price: { type: Number, required: true },

    productTotalBeforeTax: { type: Number },
    productTaxAmount: { type: Number },
    totalBeforeTax: { type: Number, required: true },

    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },

    commissionRate: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    commissionVatRate: { type: Number, required: true },
    commissionVatAmount: { type: Number, required: true },

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
    totalPrice: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    deliveryVatAmount: { type: Number, default: 0 },
    offerDiscount: { type: Number, default: 0 },
    totalProductDiscount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },

    deliGoCommission: { type: Number, required: true },
    commissionVat: { type: Number, required: true },
    fleetFee: { type: Number, required: true },
    riderNetEarnings: { type: Number, required: true },

    promoType: { type: String, enum: ['OFFER', 'NONE'], default: 'NONE' },
    offerApplied: { type: Object, default: null },

    paymentMethod: { type: String, enum: ['CARD', 'MB_WAY'], required: true },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
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

    estimatedDeliveryTime: { type: String },
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
