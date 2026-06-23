import { z } from 'zod';
import { BusinessCategoryNameEnum } from './category.model';
import { localizedValidationSchema } from '../../constant/GlobalValidation/language.validation';

// Create Business Category Validation
const createBusinessCategoryValidationSchema = z.object({
  body: z
    .object({
      name: z.enum(BusinessCategoryNameEnum, {
        required_error: 'Business category name is required',
      }),
      slug: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().default(true).optional(),
    })
    .strict(),
});

// Update Business Category Validation
const updateBusinessCategoryValidationSchema = z.object({
  body: z
    .object({
      name: z.enum(BusinessCategoryNameEnum).optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
});

// Create Product Category Validation
const createProductCategoryValidationSchema = z.object({
  body: z
    .object({
      name: localizedValidationSchema,
      slug: z.string().optional(),
      description: z.string().optional(),
      businessCategoryId: z
        .string({ required_error: 'Business category ID is required' })
        .min(1),
      isActive: z.boolean().default(true).optional(),
    })
    .strict(),
});

// Update Product Category Validation
const updateProductCategoryValidationSchema = z.object({
  body: z
    .object({
      name: localizedValidationSchema.partial().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      businessCategoryId: z.string().optional(),
      isActive: z.boolean().optional(),
      isDeleted: z.boolean().optional(),
    })
    .strict(),
});

// Create Cuisine Validation Schema
const createCuisineValidationSchema = z.object({
  body: z
    .object({
      name: localizedValidationSchema,
      slug: z.string().optional(),
      isActive: z.boolean().default(true).optional(),
    })
    .strict(),
});

// Update Cuisine Validation Schema
const updateCuisineValidationSchema = z.object({
  body: z
    .object({
      name: localizedValidationSchema.partial().optional(),
      slug: z.string().optional(),
      isActive: z.boolean().optional(),
      isDeleted: z.boolean().optional(),
    })
    .strict(),
});

export const CategoryValidation = {
  createBusinessCategoryValidationSchema,
  updateBusinessCategoryValidationSchema,
  createProductCategoryValidationSchema,
  updateProductCategoryValidationSchema,
  createCuisineValidationSchema,
  updateCuisineValidationSchema,
};
