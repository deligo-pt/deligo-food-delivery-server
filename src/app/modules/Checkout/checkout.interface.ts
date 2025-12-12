export type TCheckoutItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  vendorId: string;
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

  customerId: string;
  customerEmail: string;
  vendorId: string;

  items: TCheckoutItem[];

  totalItems: number;
  totalPrice: number;
  discount: number;
  deliveryCharge: number;
  finalAmount: number;
  couponCode?: string;
  estimatedDeliveryTime: string;

  deliveryAddress: TCheckoutAddress;

  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
  paymentMethod?: 'CARD' | 'MOBILE';
  transactionId?: string; // Stripe PaymentIntent ID
  orderId?: string; // Linked Order ID

  isConvertedToOrder?: boolean;

  isDeleted?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
};

export type TCheckoutPayload = {
  useCart?: boolean;

  items?: {
    productId: string;
    quantity: number;
  }[];

  estimatedDeliveryTime?: string;
  discount?: number;
};
