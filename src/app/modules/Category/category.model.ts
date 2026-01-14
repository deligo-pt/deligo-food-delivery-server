import { Schema, model } from 'mongoose';
import { TBusinessCategory, TProductCategory } from './category.interface';

const businessCategorySchema = new Schema<TBusinessCategory>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    icon: { type: String, required: true },
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
    icon: { type: String, required: true },
    businessCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessCategory', // reference to BusinessCategory
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productCategorySchema.index({ isActive: 1, isDeleted: 1 });

export const BusinessCategory = model<TBusinessCategory>(
  'BusinessCategory',
  businessCategorySchema
);
export const ProductCategory = model<TProductCategory>(
  'ProductCategory',
  productCategorySchema
);
