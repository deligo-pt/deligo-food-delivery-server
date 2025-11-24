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
  latitude?: number;
  longitude?: number;
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

  discount: number;
  totalItems: number;
  totalPrice: number;
  deliveryCharge: number;
  finalAmount: number;
  estimatedDeliveryTime: string;

  deliveryAddress: TCheckoutAddress;

  paymentStatus?: 'pending' | 'paid' | 'failed';
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
