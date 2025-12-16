import mongoose from 'mongoose';
import { ORDER_STATUS } from './order.constant';

export type TOrder = {
  _id?: string;

  // Relationships
  orderId: string;
  customerId: string;
  customerObjectId: mongoose.Types.ObjectId;
  vendorId: string;
  deliveryPartnerId?: string; // assigned after vendor accepts
  deliveryPartnerCancelReason?: string;

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
  deliveryCharge?: number;
  finalAmount: number;
  paymentMethod: 'CARD' | 'MOBILE';
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

  // Order Lifecycle
  orderStatus: keyof typeof ORDER_STATUS;
  cancelReason?: string;
  rejectReason?: string;

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
    longitude?: number;
    latitude?: number;
    gooAccuracy?: number;
  };

  pickupAddress?: {
    // vendor’s location
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    longitude?: number;
    latitude?: number;
    geoAccuracy?: number; // meters
  };
  dispatchPartnerPool?: string[];
  // Delivery Details
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
