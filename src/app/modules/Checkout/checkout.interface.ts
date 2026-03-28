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
    estimatedTime: number;
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
    vendor: {
      earningsWithoutTax: number;
      payableTax: number;
      vendorNetPayout: number;
    };
    rider: {
      earningsWithoutTax: number;
      payableTax: number;
      riderNetEarnings: number;
    };
  };

  offer: {
    isApplied: boolean;
    offerApplied?: TAppliedOfferSnapshot;
  };

  deliveryAddress: TAddress;

  paymentMethod?:
    | 'CARD'
    | 'MB_WAY'
    | 'APPLE_PAY'
    | 'PAYPAL'
    | 'GOOGLE_PAY'
    | 'OTHER';
  paymentStatus?: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
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
