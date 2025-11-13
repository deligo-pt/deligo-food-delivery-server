import { Schema, model } from 'mongoose';
import { TBusinessCategory, TProductCategory } from './category.interface';

const businessCategorySchema = new Schema<TBusinessCategory>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    icon: { type: String },
    image: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const productCategorySchema = new Schema<TProductCategory>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    image: { type: String },
    businessCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessCategory', // reference to BusinessCategory
      required: true,
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const BusinessCategory = model<TBusinessCategory>(
  'BusinessCategory',
  businessCategorySchema
);
export const ProductCategory = model<TProductCategory>(
  'ProductCategory',
  productCategorySchema
);
