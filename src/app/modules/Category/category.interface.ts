import mongoose from 'mongoose';

export type TBusinessCategory = {
  _id?: string;
  name: string; // e.g. "Restaurant", "Grocery", "Pharmacy"
  slug: string; // e.g. "restaurant"
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TProductCategory = {
  _id?: string;
  name: string; // e.g. "Pizza", "Burger", "Medicine"
  slug: string;
  description?: string;
  businessCategoryId: mongoose.Types.ObjectId | string; // reference to BusinessCategory
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
