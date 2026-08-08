import mongoose from 'mongoose';
import { FulfillmentType, OrderStatus, RefundStatus } from './order.constant';
import { TAppliedOfferSnapshot } from '../Checkout/checkout.interface';
import {
  TOrderPaymentStatus,
  TPaymentMethod,
} from '../../constant/GlobalInterface/payment.interface';
import {
  TAddress,
  TOrderItemSnapshot,
} from '../../constant/GlobalInterface/order.interface';

export type TInvoiceSync = {
  isSynced: boolean;
  invoiceNo?: string;
  atcud?: string;
  signature?: string;
  syncedAt?: Date;
  syncError?: string;
};

export type TOrderStatusHistory = {
  status: OrderStatus;
  timestamp: Date;
  updatedBy?: mongoose.Types.ObjectId;
  note?: string;
};

export type TOrderPickup = {
  codeHash: string; // sha256 of the raw code; raw code is never persisted
  generatedAt: Date;
  verifiedAt?: Date | null;
  verifiedBy?: mongoose.Types.ObjectId | null;
  readyAt?: Date | null;
};

export type TOrder = {
  _id?: mongoose.Types.ObjectId;
  // Relationships
  orderId: string; // Readable Business Order ID (e.g., DG-10293)

  customerId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  deliveryPartnerId?: mongoose.Types.ObjectId;
  deliveryPartnerCancelReason?: string;

  fulfillmentType: FulfillmentType;
  pickup?: TOrderPickup;

  // Items Snapshot
  items: TOrderItemSnapshot[];
  totalItems: number;
  totalQuantity: number;

  orderCalculation: {
    totalOriginalPrice: number;
    totalProductDiscount: number;
    totalOfferDiscount: number;
    totalTaxAmount: number;
    itemsSubtotal: number;
    serviceCharge: number;
    serviceChargeVatRate: number;
    serviceChargeVatAmount: number;
  };

  delivery: {
    charge: number;
    vatRate: number;
    vatAmount: number;
    totalDeliveryCharge: number;
    distance: number;
    estimatedTime: number;
    deliveryProofImage?: string;
    notes?: string;
  };

  payoutSummary: {
    grandTotal: number;
    deliGoCommission: {
      rate: number;
      amount: number;
      vatAmount: number;
      totalDeduction: number;
      earnedServiceCharge: number;
      serviceChargeVatAmount: number;
      deliveryVatAmount: number;

      totalPlatformNetRevenue: number; // Base Commission + Base Service Charge
      totalPlatformPayableTax: number; // Commission VAT + Service Charge VAT + Delivery VAT
      totalPlatformGrossHolding: number; // Total platform cash reserves held prior to merchant clearance updates
    };
    fleet: {
      rate: number;
      fee: number;
    };
    vendor: {
      earningsWithoutTax: number;
      payableTax: number;
      vendorNetPayout: number;
    };
    rider: {
      riderNetEarnings: number;
    };
  };

  offer: {
    isApplied: boolean;
    offerApplied?: TAppliedOfferSnapshot | null;
  };

  paymentMethod: TPaymentMethod;
  paymentStatus: TOrderPaymentStatus;
  transactionId?: string | null;
  isPaid: boolean;

  // Address & Location
  deliveryAddress?: TAddress; // required when fulfillmentType === 'DELIVERY'
  pickupAddress?: TAddress; // vendor storefront snapshot; set on ACCEPTED for both flows

  // Metadata
  remarks?: string;

  // Order Lifecycle Management
  orderStatus: OrderStatus;
  statusHistory: TOrderStatusHistory[];
  cancelReason?: string;
  rejectReason?: string;
  refundStatus: RefundStatus;

  dispatchPartnerPool?: string[];
  dispatchExpiresAt?: Date;

  // Delivery Timestamps
  preparationTime?: number;

  isRated?: boolean;
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
