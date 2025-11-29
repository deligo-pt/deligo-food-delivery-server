import { ORDER_STATUS } from './order.constant';

export type TOrder = {
  _id?: string;

  // Relationships
  orderId: string;
  customerId: string;
  vendorId: string;
  deliveryPartnerId?: string; // assigned after vendor accepts

  // Items
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];

  // Pricing & Payment
  totalItems: number;
  totalPrice: number;
  discount?: number;
  finalAmount: number;
  paymentMethod: 'CARD' | 'MOBILE';
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

  // Order Lifecycle
  orderStatus: keyof typeof ORDER_STATUS;
  cancelReason?: string;

  remarks?: string;
  // OTP Verification
  deliveryOtp?: string; // generated when vendor accepts
  isOtpVerified?: boolean; // vendor verifies driver OTP

  // Address & Location
  deliveryAddress: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    gooAccuracy?: number;
  };

  pickupAddress?: {
    // vendor’s location
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
    geoAccuracy?: number; // meters
  };

  // Delivery Details
  deliveryCharge?: number;
  estimatedDeliveryTime?: string; // e.g., "30 mins"
  deliveredAt?: Date;

  // Status Tracking
  isPaid: boolean;
  isDeleted: boolean;

  // Ratings (optional, for later)
  rating?: {
    vendorRating?: number;
    deliveryRating?: number;
  };
  createdAt: Date;
  updatedAt: Date;
};
