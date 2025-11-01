export type TCart = {
  customerId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
};
