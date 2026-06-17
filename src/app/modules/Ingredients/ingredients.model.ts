import { Schema, model } from 'mongoose';
import { TIngredients } from './ingredients.interface';

const ingredientsSchema = new Schema<TIngredients>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Schema.Types.ObjectId,
      ref: 'Tax',
      required: true,
    },
    unit: {
      type: String,
      required: true,
      enum: ['kg', 'g', 'litre', 'ml', 'piece', 'packet', 'box'],
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lowStockAlert: {
      type: Number,
      required: true,
      default: 5,
    },
    minOrder: {
      type: Number,
      default: 1,
      min: 1,
    },
    image: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'out-of-stock'],
      default: 'available',
    },
    shelfLifeDays: {
      type: Number,
    },
    bulkDiscount: [
      {
        minQty: { type: Number, required: true },
        discountPrice: { type: Number, required: true },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

ingredientsSchema.index({ name: 'text', description: 'text', sku: 'text' });

export const Ingredient = model<TIngredients>('Ingredient', ingredientsSchema);
