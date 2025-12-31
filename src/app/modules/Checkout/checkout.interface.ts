import mongoose from 'mongoose';

export type TAppliedOfferSnapshot = {
  offerId: mongoose.Types.ObjectId;
  title: string;
  offerType: OfferType;
  discountValue?: number;
  maxDiscountAmount?: number;
  code?: string;
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
  isActive?: boolean;
  _id?: string;
};

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
    variantName?: string;
    addons?: {
      optionId: string;
      quantity: number;
    }[];
    price?: number;
    subtotal?: number;
    taxRate?: number;
  }[];

  offerCode?: string;
  discount?: number;
  estimatedDeliveryTime?: string;
};
