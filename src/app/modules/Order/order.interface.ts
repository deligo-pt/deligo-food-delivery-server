import mongoose from 'mongoose';
import { OrderStatus } from './order.constant';
import { TAppliedOfferSnapshot } from '../Checkout/checkout.interface';
import { TPaymentMethod } from '../../constant/GlobalInterface/payment.interface';
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

export type TOrder = {
  _id?: mongoose.Types.ObjectId;
  // Relationships
  orderId: string; // Readable Business Order ID (e.g., DG-10293)

  customerId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  deliveryPartnerId?: mongoose.Types.ObjectId;
  deliveryPartnerCancelReason?: string;

  // Items Snapshot
  items: TOrderItemSnapshot[];
  totalItems: number;
  totalQuantity: number; // 🚨 UPDATED: Added to match final recalculateCartTotals engine

  orderCalculation: {
    totalOriginalPrice: number;
    totalProductDiscount: number;
    totalOfferDiscount: number;
    totalTaxAmount: number;
    itemsSubtotal: number;
    serviceCharge: number;
    serviceChargeVatRate: number; // 🚨 UPDATED: Added for Strict Portugal IVA Compliance (23)
    serviceChargeVatAmount: number; // 🚨 UPDATED: Added for Platform fee VAT storage
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
  paymentStatus: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED';
  transactionId?: string | null;
  isPaid: boolean;

  // Address & Location
  deliveryAddress: TAddress;
  pickupAddress?: TAddress;

  // Metadata
  remarks?: string;

  // Order Lifecycle Management
  orderStatus: OrderStatus;
  cancelReason?: string;
  rejectReason?: string;

  dispatchPartnerPool?: string[];
  dispatchExpiresAt?: Date;

  // Delivery Timestamps
  pickedUpAt?: Date;
  deliveredAt?: Date;
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
