import mongoose from 'mongoose';
import { OfferType } from '../Offer/offer.constant';
import { TAddress, TOrderItemSnapshot } from '../../constant/order.constant';

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

export type TCheckoutItem = {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  subtotal: number;
  vendorId: mongoose.Types.ObjectId;
  estimatedDeliveryTime?: string;
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
  customerEmail?: string; // will check is it need?
  contactNumber?: string; // will check is it need?

  items: TOrderItemSnapshot[];
  totalItems: number;

  totalPrice: number;
  taxAmount: number;

  deliveryCharge: number;
  deliveryVatRate: number;
  deliveryVatAmount: number;
  totalDeliveryCharge: number;

  deliGoCommissionRate: number;
  deliGoCommission: number;
  commissionVat: number; // €0.35 (Total VAT collected from vendor)
  deliGoCommissionNet: number; // €1.50 (Total Net Commission)
  totalVendorDeduction: number;

  vendorNetPayout: number;

  fleetCommissionRate: number;
  fleetFee: number; // €0.08 (4% of Net Delivery)
  riderNetEarnings: number; // €2.38 (Payout to partner after fleet fee)

  offerDiscount: number;
  totalProductDiscount: number;
  subtotal: number;

  promoType: 'OFFER' | 'NONE';
  offerId?: mongoose.Types.ObjectId | null;

  offerApplied?: TAppliedOfferSnapshot;
  deliveryAddress: TAddress;
  estimatedDeliveryTime: string;

  paymentMethod?: 'CARD' | 'MOBILE';
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
  transactionId?: string; // Stripe PaymentIntent ID

  isConvertedToOrder?: boolean;
  orderId?: mongoose.Types.ObjectId; // Linked Order ID

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
      optionId: string;
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
