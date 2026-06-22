import mongoose, { Types } from 'mongoose';
import { TLocalizedText } from '../../constant/GlobalInterface/language.interface';

export const BusinessCategoryName = {
  RESTAURANT: 'RESTAURANT',
  STORE: 'STORE',
} as const;

export type TBusinessCategoryName =
  (typeof BusinessCategoryName)[keyof typeof BusinessCategoryName];

export const BusinessCategoryTranslation = {
  [BusinessCategoryName.RESTAURANT]: {
    en: 'Restaurant',
    pt: 'Restaurante',
  },
  [BusinessCategoryName.STORE]: {
    en: 'Store',
    pt: 'Loja',
  },
} as const;

export type TBusinessCategory = {
  _id?: Types.ObjectId;
  name: TBusinessCategoryName;
  slug: string;
  description?: string;
  icon: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TProductCategory = {
  _id?: Types.ObjectId;
  name: TLocalizedText; // e.g. "Pizza", "Burger", "Medicine"
  slug: string;
  description?: string;
  icon: string;
  businessCategoryId: mongoose.Types.ObjectId | string; // reference to BusinessCategory
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TCuisine = {
  _id?: Types.ObjectId;
  name: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
