import { Types } from 'mongoose';
import { TPaymentMethod } from '../../constant/GlobalInterface/payment.interface';

export type TOrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED';
export type TPaymentStatus = 'PROCESSING' | 'PAID'; // | 'FAILED' | 'REFUNDED';

export interface IIngredientOrderDetail {
  totalQuantity: number;
  totalAmount: number;
  ingredient: Types.ObjectId; // it will have everything related ingredient
}

export interface IIngredientOrder {
  vendor: Types.ObjectId;
  admin?: Types.ObjectId;
  orderId?: string;
  orderDetails: IIngredientOrderDetail;
  deliveryAddress: {
    label: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    longitude: number;
    latitude: number;
    geoAccuracy: number;
    detailedAddress: string;
  };
  delivery: {
    charge: number;
    distance: number;
    estimatedTime: number;
  };

  grandTotal: number;
  paymentMethod: TPaymentMethod;

  orderStatus: TOrderStatus;
  paymentStatus: TPaymentStatus;

  statusHistory: {
    shippedAt?: Date;
    deliveredAt?: Date;
  };
  transactionId?: string;
  isPaid?: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
