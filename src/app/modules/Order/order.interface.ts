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

  totalItems: number;

  orderCalculation: {
    totalOriginalPrice: number;
    totalProductDiscount: number;
    totalOfferDiscount: number;
    taxableAmount: number;
    totalTaxAmount: number;
  };

  delivery: {
    charge: number;
    vatRate: number;
    vatAmount: number;
    totalDeliveryCharge: number;
    distance: number;
    estimatedTime: string;
    deliveryProofImage?: string;
  };

  payoutSummary: {
    grandTotal: number;
    deliGoCommission: {
      rate: number;
      amount: number;
      vatAmount: number;
      totalDeduction: number;
    };
    fleet: {
      rate: number;
      fee: number;
    };
    vendorNetPayout: number;
    riderNetEarnings: number;
  };

  offer: {
    isApplied: boolean;
    offerApplied?: TAppliedOfferSnapshot;
  };

  paymentMethod: 'CARD' | 'MB_WAY' | 'APPLE_PAY' | 'OTHER';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
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
  pickedUpAt?: Date;
  deliveredAt?: Date;
  preparationTime?: number;

  isRated?: boolean;

  // Status Tracking
  isDeleted: boolean;

  invoiceSync?: TInvoiceSync;

  ratingStatus?: {
    isProductRated: boolean;
    isVendorRated: boolean;
    isDeliveryRated: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
};
