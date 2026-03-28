import { z } from 'zod';

// Create Ingredient Validation 
const createIngredientValidationSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Ingredient name is required').trim(),
        category: z.string().min(1, 'Category is required'),
        description: z.string().optional(),
        price: z.number().positive('Price must be a positive number'),
        stock: z.number().int().nonnegative('Stock cannot be negative'),
        minOrder: z.number().int().positive().optional().default(1),
    }),
});

// Update Ingredient Validation 
const updateIngredientValidationSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        price: z.number().positive().optional(),
        stock: z.number().int().nonnegative().optional(),
        minOrder: z.number().int().positive().optional(),
        image: z.string().optional(),
    }),
});

export const IngredientValidation = {
    createIngredientValidationSchema,
    updateIngredientValidationSchema,
};