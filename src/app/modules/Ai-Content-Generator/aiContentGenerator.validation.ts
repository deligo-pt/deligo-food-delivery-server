import { z } from 'zod';

const generateProductDescriptionValidationSchema = z.object({
  body: z.object({
    productName: z
      .string({
        required_error: 'Product name is required',
      })
      .trim()
      .min(1, 'Product name cannot be empty')
      .max(100, 'Product name cannot exceed 100 characters'),

    productCategory: z
      .string({
        required_error: 'Product category is required',
      })
      .trim()
      .min(1, 'Product category cannot be empty')
      .max(100, 'Product category cannot exceed 100 characters'),

    productImageUrl: z
      .string({
        required_error: 'Product image URL is required',
      })
      .trim()
      .url('Please provide a valid image URL'),
    language: z.string().optional(),
  }),
});

export const AIContentGeneratorValidation = {
  generateProductDescriptionValidationSchema,
};
