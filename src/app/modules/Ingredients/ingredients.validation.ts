import { z } from 'zod';

// Create Ingredient Validation
const createIngredientValidationSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, 'Ingredient name is required').trim(),
      category: z.string().min(1, 'Category is required'),
      description: z.string().optional(),
      price: z.number().positive('Price must be a positive number'),
      tax: z.string().min(1, 'Tax ID reference is required'),
      unit: z.enum(['kg', 'g', 'litre', 'ml', 'piece', 'packet', 'box'], {
        required_error: 'Valid unit is required',
      }),
      stock: z.number().int().nonnegative('Stock cannot be negative'),
      lowStockAlert: z.number().int().nonnegative().default(5),
      minOrder: z.number().int().positive().optional().default(1),
      image: z.string().url('Invalid image URL'),
      status: z.enum(['available', 'out-of-stock']).default('available'),
      shelfLifeDays: z.number().int().positive().optional(),
      bulkDiscount: z
        .array(
          z.object({
            minQty: z.number().int().positive('Bulk quantity must be positive'),
            discountPrice: z
              .number()
              .positive('Discount price must be positive'),
          }),
        )
        .optional(),
      isDeleted: z.boolean().optional().default(false),
    })
    .strict(),
});
// Update Ingredient Validation
const updateIngredientValidationSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(1, 'Ingredient name cannot be empty')
        .trim()
        .optional(),
      category: z.string().min(1, 'Category cannot be empty').optional(),
      description: z.string().optional(),
      sku: z
        .string()
        .min(1, 'SKU cannot be empty')
        .trim()
        .toUpperCase()
        .optional(),
      price: z.number().positive('Price must be a positive number').optional(),
      tax: z.string().min(1, 'Valid Tax ID is required').optional(),
      unit: z
        .enum(['kg', 'g', 'litre', 'ml', 'piece', 'packet', 'box'])
        .optional(),
      stock: z
        .number()
        .int()
        .nonnegative('Stock cannot be negative')
        .optional(),
      lowStockAlert: z.number().int().nonnegative().optional(),
      minOrder: z
        .number()
        .int()
        .positive('Minimum order must be positive')
        .optional(),
      image: z.string().url('Invalid image URL').optional(),
      status: z.enum(['available', 'out-of-stock']).optional(),
      shelfLifeDays: z.number().int().positive().optional(),
      bulkDiscount: z
        .array(
          z.object({
            minQty: z.number().int().positive('Bulk quantity must be positive'),
            discountPrice: z
              .number()
              .positive('Discount price must be positive'),
          }),
        )
        .optional(),
      isDeleted: z.boolean().optional(),
    })
    .strict(),
});

export const IngredientValidation = {
  createIngredientValidationSchema,
  updateIngredientValidationSchema,
};
