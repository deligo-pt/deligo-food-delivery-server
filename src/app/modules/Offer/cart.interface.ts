export type TCartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
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
