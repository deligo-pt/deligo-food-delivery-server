import mongoose from 'mongoose';
import { TOrderItemSnapshot } from '../../constant/GlobalInterface/order.interface';

export type TCartItem = TOrderItemSnapshot & {
  isActive: boolean;
};

export type TCartItemInput = {
  items: {
    productId: string;
    quantity: number;
    variationSku?: string;
    addons?: { addOnId: string; quantity: number }[];
  }[];
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

  status?: 'abandoned';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
