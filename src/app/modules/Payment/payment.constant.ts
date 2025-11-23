export type TCheckoutItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  vendorId: string;
  estimatedDeliveryTime: string;
};

export type TDeliveryAddress = {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  goAccuracy?: number;
  isActive?: boolean;
  _id?: string;
};

export type TCheckoutData = {
  customerId: string;
  vendorId: string;
  items: TCheckoutItem[];
  discount: number;
  totalItems: number;
  totalPrice: number;
  deliveryCharge: number;
  finalAmount: number;
  estimatedDeliveryTime: string;
  deliveryAddress: TDeliveryAddress;
};
