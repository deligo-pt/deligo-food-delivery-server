import { Types } from 'mongoose';

export type TIngredients = {
  name: string;
  category: string;
  description?: string;
  sku: string;
  price: number;
  tax: Types.ObjectId;
  unit: 'kg' | 'g' | 'litre' | 'ml' | 'piece' | 'packet' | 'box';
  stock: number;
  lowStockAlert: number;
  minOrder?: number;
  image: string;
  status: 'available' | 'out-of-stock';
  shelfLifeDays?: number;
  bulkDiscount?: { minQty: number; discountPrice: number }[];
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
