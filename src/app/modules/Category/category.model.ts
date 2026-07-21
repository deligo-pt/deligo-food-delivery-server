import { Schema, model } from 'mongoose';
import {
  TBusinessCategory,
  TCuisine,
  TProductCategory,
} from './category.interface';
import { localizedSchema } from '../../constant/GlobalModel/language.model';

export const BusinessCategoryNameEnum = ['RESTAURANT', 'STORE'] as const;

const businessCategorySchema = new Schema<TBusinessCategory>(
  {
    name: {
      type: localizedSchema,
    },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    icon: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const productCategorySchema = new Schema<TProductCategory>(
  {
    name: { type: localizedSchema, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    icon: { type: String, required: true },
    businessCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessCategory',
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const cuisineSchema = new Schema<TCuisine>(
  {
    name: { type: localizedSchema, required: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    imageUrl: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

businessCategorySchema.index({ 'name.en': 1, 'name.pt': 1 }, { unique: true });
productCategorySchema.index({ isActive: 1, isDeleted: 1 });
productCategorySchema.index({ 'name.en': 1 }, { unique: true });
cuisineSchema.index({ 'name.en': 1 }, { unique: true });

export const BusinessCategory = model<TBusinessCategory>(
  'BusinessCategory',
  businessCategorySchema,
);
export const ProductCategory = model<TProductCategory>(
  'ProductCategory',
  productCategorySchema,
);

export const Cuisine = model<TCuisine>('Cuisine', cuisineSchema);
