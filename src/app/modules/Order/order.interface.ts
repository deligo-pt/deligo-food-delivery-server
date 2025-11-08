export type TOrderData = {
  items: {
    productId: string;
  }[];
};

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
  totalPrice: number;
  discount?: number;
  finalAmount: number;
  paymentMethod: 'card' | 'mobile';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';

  // Order Lifecycle
  orderStatus:
    | 'pending' // created by customer, waiting for vendor
    | 'accepted' // vendor accepted
    | 'rejected' // vendor rejected
    | 'assigned' // delivery partner assigned
    | 'pickedUp' // delivery partner collected product
    | 'onTheWay' // delivery partner en route
    | 'delivered' // completed successfully
    | 'canceled'; // canceled (vendor/customer/admin)

  remarks?: string;
  // OTP Verification
  deliveryOtp?: string; // generated when vendor accepts
  isOtpVerified?: boolean; // vendor verifies driver OTP

  // Address & Location
  deliveryAddress: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  pickupAddress?: {
    // vendor’s location
    street: string;
    city: string;
    latitude?: number;
    longitude?: number;
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
