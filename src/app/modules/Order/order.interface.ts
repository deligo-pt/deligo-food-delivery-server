import mongoose from 'mongoose';
import { OrderStatus } from './order.constant';
import { TAddress, TOrderItemSnapshot } from '../../constant/order.constant';
import { TAppliedOfferSnapshot } from '../Checkout/checkout.interface';

export type TInvoiceSync = {
  isSynced: boolean;
  invoiceNo?: string;
  atcud?: string;
  signature?: string;
  syncedAt?: Date;
  syncError?: string;
};

export type TOrder = {
  _id?: mongoose.Types.ObjectId;

  // Relationships
  orderId: string;
  customerId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  deliveryPartnerId?: mongoose.Types.ObjectId; // assigned after vendor accepts
  deliveryPartnerCancelReason?: string;

  // Items
  items: TOrderItemSnapshot[];

  // Pricing & Payment
  totalItems: number;
  totalPrice: number;
  offerDiscount?: number;
  totalProductDiscount?: number;
  taxAmount?: number;
  deliveryCharge?: number;
  deliveryVatAmount: number;
  subtotal: number;

  deliGoCommission: number;
  commissionVat: number;
  fleetFee: number;
  riderNetEarnings: number;

  promoType: 'OFFER' | 'NONE';
  offerApplied?: TAppliedOfferSnapshot;

  paymentMethod: 'CARD' | 'MB_WAY';
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
  dispatchExpiresAt?: Date;
  // Delivery Details
  estimatedDeliveryTime?: string; // e.g., "30 mins"
  pickedUpAt?: Date;
  deliveredAt?: Date;
  preparationTime?: number;

  isRated?: boolean;

  // Status Tracking
  isDeleted: boolean;

  invoiceSync?: TInvoiceSync;

  createdAt: Date;
  updatedAt: Date;
};
