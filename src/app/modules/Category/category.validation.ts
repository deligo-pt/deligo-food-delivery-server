import { z } from 'zod';

// Create Business Category Validation
const createBusinessCategoryValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Business category name is required' })
      .min(2, 'Business category name must be at least 2 characters'),
    slug: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().default(true).optional(),
  }),
});

// Update Business Category Validation
const updateBusinessCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

// Create Product Category Validation
const createProductCategoryValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Product category name is required' })
      .min(2, 'Product category name must be at least 2 characters'),
    slug: z.string().optional(),
    description: z.string().optional(),
    businessCategoryId: z
      .string({ required_error: 'Business category ID is required' })
      .min(1),
    isActive: z.boolean().default(true).optional(),
  }),
});

// Update Product Category Validation
const updateProductCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    businessCategoryId: z.string().optional(),
    isActive: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
  }),
});

export const CategoryValidation = {
  createBusinessCategoryValidationSchema,
  updateBusinessCategoryValidationSchema,
  createProductCategoryValidationSchema,
  updateProductCategoryValidationSchema,
};
