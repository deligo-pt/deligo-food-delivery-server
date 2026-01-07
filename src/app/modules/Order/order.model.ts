import { model, Schema } from 'mongoose';
import { TOrder } from './order.interface';
import { ORDER_STATUS } from './order.constant';
import { addressSchema } from '../../constant/address.constant';

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
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
    totalBeforeTax: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
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
    discount: { type: Number, default: 0 },
    subTotal: { type: Number, required: true },

    couponId: { type: Schema.Types.ObjectId, default: null, ref: 'Coupon' },

    paymentMethod: { type: String, enum: ['CARD', 'MOBILE'], required: true },
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

    deliveryAddress: { type: addressSchema, required: true },
    pickupAddress: { type: addressSchema },

    estimatedDeliveryTime: { type: String },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    preparationTime: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },

    rating: {
      foodRating: { type: Number, default: 0 },
      deliveryRating: { type: Number, default: 0 },
      review: { type: String },
    },
  },
  { timestamps: true }
);

// The "Dispatching" Engine (Critical for partnerAcceptsDispatchedOrder)
orderSchema.index({
  orderStatus: 1,
  deliveryPartnerId: 1,
  dispatchPartnerPool: 1,
});

// Customer History (Optimized for the "My Orders" tab)
orderSchema.index({ customerId: 1, createdAt: -1 });

// Coupon analytics main index
orderSchema.index({
  couponId: 1,
  vendorId: 1,
  paymentStatus: 1,
  isDeleted: 1,
  createdAt: -1,
});

// For top items aggregation
orderSchema.index({
  couponId: 1,
  vendorId: 1,
  'items.productId': 1,
});

export const Order = model<TOrder>('Order', orderSchema);
