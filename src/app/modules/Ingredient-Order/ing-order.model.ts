import {
  TIngredientOrder,
  TIngredientOrderDetail,
} from './ing-order.interface';
import { PaymentMethods } from '../../constant/GlobalConstant/payment.constant';
import { model, Query, Schema } from 'mongoose';

const ingredientOrderDetailSchema = new Schema<TIngredientOrderDetail>(
  {
    ingredientId: {
      type: Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: [true, 'Ingredient reference is required'],
    },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity cannot be less than 1'],
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    taxRate: {
      type: Number,
      required: true,
      min: [0, 'Tax rate cannot be negative'],
    },
    taxAmount: {
      type: Number,
      required: true,
      min: [0, 'Tax amount cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
  },
  { _id: false },
);

const ingredientOrderSchema = new Schema<TIngredientOrder>(
  {
    orderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor Id is required'],
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    orderDetails: {
      type: [ingredientOrderDetailSchema],
      required: [true, 'Order details are required'],
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
      detailedAddress: { type: String },
    },
    delivery: {
      charge: { type: Number, required: true, default: 0 },
      vatRate: { type: Number, required: true, default: 0 },
      vatAmount: { type: Number, required: true, default: 0 },
      totalDeliveryCharge: { type: Number, required: true, default: 0 },
    },
    orderCalculation: {
      totalOriginalPrice: { type: Number, required: true, min: 0 },
      totalProductDiscount: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      taxableAmount: { type: Number, required: true, min: 0 },
      totalTaxAmount: { type: Number, required: true, min: 0 },
    },
    grandTotal: {
      type: Number,
      required: [true, 'Grand total is required'],
      min: [0, 'Grand total cannot be negative'],
    },
    paymentMethod: {
      type: String,
      enum: {
        values: Object.values(PaymentMethods),
        message: '{VALUE} is not a valid payment method',
      },
      required: true,
    },
    orderStatus: {
      type: String,
      enum: {
        values: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'],
        message: '{VALUE} is not a valid order status',
      },
      default: 'PENDING',
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['PROCESSING', 'PAID'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'PROCESSING',
    },
    statusHistory: {
      shippedAt: { type: Date },
      deliveredAt: { type: Date },
    },
    transactionId: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

ingredientOrderSchema.pre(
  /^find/,
  function (this: Query<unknown, unknown>, next) {
    this.where({ isDeleted: { $ne: true } });
    next();
  },
);

export const IngredientOrder = model<TIngredientOrder>(
  'IngredientOrder',
  ingredientOrderSchema,
);
