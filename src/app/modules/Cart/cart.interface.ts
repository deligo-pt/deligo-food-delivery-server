export type TCartItem = {
  productId: string;
  vendorId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  isActive: boolean;
};

export type TCart = {
  _id?: string;
  customerId: string;
  items: TCartItem[];
  totalItems: number;
  totalPrice: number;
  discount?: number;
  couponCode?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
