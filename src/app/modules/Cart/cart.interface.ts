import mongoose from 'mongoose';

export type TCartItem = {
  productId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  subtotal: number;
  isActive: boolean;
};

export type TCart = {
  _id?: string;
  customerId: mongoose.Types.ObjectId;
  items: TCartItem[];
  totalItems: number;
  totalPrice: number;
  discount?: number;
  subtotal: number;
  couponId?: mongoose.Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
