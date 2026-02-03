import mongoose from 'mongoose';
import { TOrderItemSnapshot } from '../../constant/order.constant';

export type TCartItem = TOrderItemSnapshot & {
  isActive: boolean;
};

export type TCart = {
  customerId: mongoose.Types.ObjectId;
  items: TCartItem[];
  totalItems: number;
  totalPrice: number;
  taxAmount?: number;
  discount?: number;
  subtotal: number;

  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
