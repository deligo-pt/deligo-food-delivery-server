export type TOrder = {
  customerId: string;
  vendorId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
  totalPrice: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  orderStatus:
    | 'pending'
    | 'accepted'
    | 'assigned'
    | 'picked'
    | 'delivered'
    | 'canceled';
  deliveryAddress: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TOrderData = {
  items: {
    productId: string;
  }[];
};
