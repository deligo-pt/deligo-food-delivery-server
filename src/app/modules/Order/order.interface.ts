import mongoose from 'mongoose';
import { OrderStatus } from './order.constant';
import { TAddress, TOrderItemSnapshot } from '../../constant/order.constant';

export type TOrder = {
  _id?: mongoose.Types.ObjectId;

  // Relationships
  orderId: string;
  customerId: mongoose.Types.ObjectId;
  // customer: {
  //   name: string;
  //   email: string;
  //   contactNumber: string;
  // };
  vendorId: mongoose.Types.ObjectId;
  deliveryPartnerId?: mongoose.Types.ObjectId; // assigned after vendor accepts
  deliveryPartnerCancelReason?: string;

  // Items
  items: TOrderItemSnapshot[];

  // Pricing & Payment
  totalItems: number;
  totalPrice: number;
  discount?: number;
  taxAmount?: number;
  deliveryCharge?: number;
  subTotal: number;

  couponId?: mongoose.Types.ObjectId;

  paymentMethod: 'CARD' | 'MOBILE';
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transactionId?: string;
  isPaid: boolean;

  // Address & Location
  deliveryAddress: TAddress;
  pickupAddress?: TAddress;

  // OTP Verification
  deliveryOtp?: string; // generated when vendor accepts
  isOtpVerified?: boolean; // vendor verifies driver OTP
  remarks?: string;

  // Order Lifecycle
  orderStatus: OrderStatus;
  cancelReason?: string;
  rejectReason?: string;

  dispatchPartnerPool?: string[];
  // Delivery Details
  estimatedDeliveryTime?: string; // e.g., "30 mins"
  pickedUpAt?: Date;
  deliveredAt?: Date;
  preparationTime?: number;

  sageSync?: {
    isSynced: boolean;
    invoiceNo?: string; // TransDocNumber from Sage
    atcud?: string; // Official Tax Identifier
    signature?: string; // Digital Signature for certification
    syncError?: string; // Error logs if sync fails
    syncedAt?: Date;
  };

  // Status Tracking
  isDeleted: boolean;

  // Ratings (optional, for later)
  isRated?: boolean;
  createdAt: Date;
  updatedAt: Date;
};
