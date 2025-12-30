import mongoose from 'mongoose';

import {
  TAddress,
  TAppliedOfferSnapshot,
  TOrderItemSnapshot,
} from '../../constant/order.constant';

export type TCheckoutSummary = {
  customerId: mongoose.Types.ObjectId;

  customerEmail?: string; // will check is it need?
  contactNumber?: string; // will check is it need?

  vendorId: mongoose.Types.ObjectId;

  items: TOrderItemSnapshot[];
  totalItems: number;

  totalPrice: number;
  discount: number;
  deliveryCharge: number;
  taxAmount: number;
  subTotal: number;

  offerApplied?: TAppliedOfferSnapshot;
  couponId?: mongoose.Types.ObjectId;

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
  }[];

  offerCode?: string;
  discount?: number;
  estimatedDeliveryTime?: string;
};
