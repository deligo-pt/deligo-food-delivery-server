import { model, Schema } from 'mongoose';
import { TOrder } from './order.interface';
import { ORDER_STATUS } from './order.constant';

const orderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const deliveryAddressSchema = new Schema(
  {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' },

    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },

    geoAccuracy: { type: Number, default: null },
  },
  { _id: false }
);

const pickupAddressSchema = new Schema(
  {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    geoAccuracy: { type: Number, default: null },
  },
  { _id: false }
);

const ratingSchema = new Schema(
  {
    vendorRating: { type: Number, min: 0, max: 5 },
    deliveryRating: { type: Number, min: 0, max: 5 },
  },
  { _id: false }
);

const orderSchema = new Schema<TOrder>(
  {
    orderId: { type: String, required: true, unique: true },
    customerId: { type: String, required: true },
    vendorId: { type: String, required: true },
    deliveryPartnerId: { type: String },

    items: { type: [orderItemSchema], required: true },

    totalItems: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },

    paymentMethod: { type: String, enum: ['CARD', 'MOBILE'], required: true },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },

    orderStatus: {
      type: String,
      enum: Object.keys(ORDER_STATUS),
      default: 'PENDING',
    },

    remarks: { type: String, default: '' },

    deliveryOtp: { type: String },
    isOtpVerified: { type: Boolean, default: false },

    deliveryAddress: { type: deliveryAddressSchema, required: true },
    pickupAddress: { type: pickupAddressSchema },

    deliveryCharge: { type: Number, default: 0 },
    estimatedDeliveryTime: { type: String },
    deliveredAt: { type: Date },

    isPaid: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    rating: { type: ratingSchema },
  },
  { timestamps: true }
);

// --- Pre-save hook: auto-generate orderId & recalculate finalAmount ---
orderSchema.pre('save', function (next) {
  const total = this.totalPrice || 0;
  const discount = this.discount || 0;

  // Calculate final amount
  this.finalAmount = parseFloat((total - (total * discount) / 100).toFixed(2));

  next();
});

export const Order = model<TOrder>('Order', orderSchema);
