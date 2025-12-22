import mongoose from 'mongoose';

export type TCheckoutItem = {
  productId: mongoose.Types.ObjectId;
  name: string;
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
  _id?: string;

  customerId: mongoose.Types.ObjectId;
  customerEmail: string;
  contactNumber: string;
  vendorId: mongoose.Types.ObjectId;

  items: TCheckoutItem[];

  totalItems: number;
  totalPrice: number;
  discount: number;
  deliveryCharge: number;
  subTotal: number;
  couponId?: mongoose.Types.ObjectId;
  estimatedDeliveryTime: string;

  deliveryAddress: TCheckoutAddress;

  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
  paymentMethod?: 'CARD' | 'MOBILE';
  transactionId?: string; // Stripe PaymentIntent ID
  orderId?: mongoose.Types.ObjectId; // Linked Order ID

  isConvertedToOrder?: boolean;

  isDeleted?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
};

export type TCheckoutPayload = {
  useCart?: boolean;

  items?: {
    productId: mongoose.Types.ObjectId;
    quantity: number;
  }[];

  estimatedDeliveryTime?: string;
  discount?: number;
};
