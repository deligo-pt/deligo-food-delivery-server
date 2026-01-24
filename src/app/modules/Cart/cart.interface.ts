import mongoose from 'mongoose';
import { TOrderItemSnapshot } from '../../constant/order.constant';

export type TCartItem = TOrderItemSnapshot & {
  variationSku?: string | null;
  isActive: boolean;
};

export type TCart = {
  customerId: mongoose.Types.ObjectId;
  items: TCartItem[];
  totalItems: number;
  totalPrice: number;
  discount?: number;
  couponId?: mongoose.Types.ObjectId | null;
  taxAmount?: number;
  subtotal: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
