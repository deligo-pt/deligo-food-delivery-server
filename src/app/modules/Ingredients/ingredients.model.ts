import { Schema, model } from "mongoose";
import { IIngredients } from "./ingredients.interface";

const ingredientsSchema = new Schema<IIngredients>(
    {
        name: { type: String, required: true, trim: true },
        category: { type: String, required: true },
        description: { type: String },
        sku: { type: String, required: true, unique: true },
        price: { type: Number, required: true },
        stock: { type: Number, required: true, default: 0 },
        minOrder: { type: Number, default: 1 },
        image: { type: String, required: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

export const Ingredient = model<IIngredients>("Ingredient", ingredientsSchema);