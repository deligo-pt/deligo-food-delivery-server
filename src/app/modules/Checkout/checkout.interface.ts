import mongoose from 'mongoose';
import { OfferType } from '../Offer/offer.constant';
import {
  TAddress,
  TOrderItemSnapshot,
} from '../../constant/GlobalInterface/order.interface';
import {
  TOrderPaymentStatus,
  TPaymentMethod,
} from '../../constant/GlobalInterface/payment.interface';

export type TAppliedOfferSnapshot = {
  promoId: mongoose.Types.ObjectId;
  title: string;
  promoType: 'OFFER' | 'NONE';
  discountType: OfferType;
  discountValue?: number;
  maxDiscountAmount?: number;
  code?: string;

  bogoSnapshot?: {
    buyQty: number;
    getQty: number;
    productId: mongoose.Types.ObjectId;
    productName?: string;
  };
};

export type TCheckoutAddress = {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  longitude?: number;
  latitude?: number;
  geoAccuracy?: number;
  detailedAddress?: string;
  isActive?: boolean;
  _id?: string;
};

export type TCheckoutSummary = {
  customerId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  customerEmail?: string;
  contactNumber?: string;

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

      totalPlatformNetRevenue: number;
      totalPlatformPayableTax: number;
      totalPlatformGrossHolding: number;
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
    offerApplied?: TAppliedOfferSnapshot;
  };

  deliveryAddress: TAddress;

  paymentMethod?: TPaymentMethod;
  paymentStatus?: TOrderPaymentStatus;
  transactionId?: string;

  isConvertedToOrder?: boolean;
  orderId?: mongoose.Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
};

export type TCheckoutPayload = {
  useCart?: boolean;

  items?: {
    productId: mongoose.Types.ObjectId;
    quantity: number;
    variationName?: string;
    variationSku?: string;
    addons?: {
      optionSku: string;
      quantity: number;
    }[];
    price?: number;
    subtotal?: number;
    taxRate?: number;
  }[];

  offerCode?: string;
  offerDiscount?: number;
  estimatedDeliveryTime?: string;
};
