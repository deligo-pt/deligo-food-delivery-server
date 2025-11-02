export type TCart = {
  customerId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
  totalPrice: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
