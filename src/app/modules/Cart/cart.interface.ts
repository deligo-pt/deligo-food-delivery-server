import mongoose from 'mongoose';
import { TOrderItemSnapshot } from '../../constant/order.constant';

export type TCartItem = TOrderItemSnapshot & {
  isActive: boolean;
};

export type TCart = {
  customerId: mongoose.Types.ObjectId;

  items: TCartItem[];

  totalItems: number;

  cartCalculation: {
    totalOriginalPrice: number;
    totalProductDiscount: number;
    taxableAmount: number;
    totalTaxAmount: number;
    grandTotal: number;
  };

  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
