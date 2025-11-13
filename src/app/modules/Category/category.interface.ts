import { Types } from 'mongoose';

export type TBusinessCategory = {
  _id?: string;
  name: string; // e.g. "Restaurant", "Grocery", "Pharmacy"
  slug: string; // e.g. "restaurant"
  description?: string;
  icon?: string; // optional icon url
  image?: string; // category banner or logo
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TProductCategory = {
  _id?: string;
  name: string; // e.g. "Pizza", "Burger", "Medicine"
  slug: string;
  description?: string;
  image?: string;
  businessCategoryId: Types.ObjectId | string; // 🔗 reference to BusinessCategory
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
