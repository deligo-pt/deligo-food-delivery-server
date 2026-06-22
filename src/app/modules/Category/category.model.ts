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
      type: String,
      enum: BusinessCategoryNameEnum,
      required: true,
      unique: true,
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

const CuisineSchema = new Schema<TCuisine>(
  {
    name: { type: String, required: true, unique: true, trim: true },
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

productCategorySchema.index({ isActive: 1, isDeleted: 1 });
productCategorySchema.index({ 'name.en': 1 }, { unique: true });

export const BusinessCategory = model<TBusinessCategory>(
  'BusinessCategory',
  businessCategorySchema,
);
export const ProductCategory = model<TProductCategory>(
  'ProductCategory',
  productCategorySchema,
);

export const Cuisine = model<TCuisine>('Cuisine', CuisineSchema);
