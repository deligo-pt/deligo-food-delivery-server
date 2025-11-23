export interface ICheckoutItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  vendorId: string;
  estimatedDeliveryTime?: string;
}

export interface ICheckoutAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  goAccuracy?: number;
  isActive?: boolean;
  _id?: string;
}

export interface ICheckoutSummary {
  _id?: string;

  customerId: string;
  vendorId: string;

  items: ICheckoutItem[];

  discount: number;
  totalItems: number;
  totalPrice: number;
  deliveryCharge: number;
  finalAmount: number;
  estimatedDeliveryTime: string;

  deliveryAddress: ICheckoutAddress;

  isConvertedToOrder?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}
