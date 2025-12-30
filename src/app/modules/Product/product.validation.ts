import { z } from 'zod';

// Variation Options Schema (e.g., Small, Medium, Large)
const variationOptionSchema = z.object({
  label: z.string({ required_error: 'Variation label is required' }),
  price: z.number().min(0, 'Variation price must be non-negative'),
  sku: z.string().optional(),
});

// Variation Group Schema (e.g., Size, Color)
const variationSchema = z.object({
  name: z.string({ required_error: 'Variation name is required' }),
  options: z
    .array(variationOptionSchema)
    .min(1, 'At least one option is required'),
});

// createProductValidationSchema
const createProductValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required'),
    description: z.string({ required_error: 'Description is required' }),
    category: z.string().min(1, 'Category is required'),
    subCategory: z.string().optional(),
    brand: z.string().optional(),

    variations: z.array(variationSchema).optional(),
    addonGroups: z.array(z.string()).optional(),

    pricing: z.object({
      price: z.number().min(0, 'Price must be positive'),
      discount: z.number().min(0).max(100).default(0),
      taxRate: z.number().min(0).max(100).default(0),
      finalPrice: z.number().optional(),
      currency: z.string().default('BDT'),
    }),

    stock: z.object({
      quantity: z.number().min(0, 'Quantity must be non-negative'),
      unit: z.string().optional(),
      availabilityStatus: z
        .enum(['In Stock', 'Out of Stock', 'Limited'])
        .default('In Stock'),
    }),

    tags: z.array(z.string()).optional(),

    attributes: z
      .record(
        z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.array(z.string()),
          z.null(),
        ])
      )
      .optional(),

    meta: z
      .object({
        isFeatured: z.boolean().default(false),
        isAvailableForPreOrder: z.boolean().default(false),
        status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
        origin: z.string().optional(),
      })
      .optional(),
  }),
});

// updateProductValidationSchema
const updateProductValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    brand: z.string().optional(),

    // New Fields Added for Update
    variations: z.array(variationSchema).optional(),
    addonGroups: z.array(z.string()).optional(),

    pricing: z
      .object({
        price: z.number().min(0).optional(),
        discount: z.number().min(0).max(100).optional(),
        taxRate: z.number().min(0).max(100).optional(), // Fixed from 'tax' to 'taxRate'
        finalPrice: z.number().optional(),
        currency: z.string().optional(),
      })
      .optional(),

    stock: z
      .object({
        quantity: z.number().min(0).optional(),
        unit: z.string().optional(),
        availabilityStatus: z
          .enum(['In Stock', 'Out of Stock', 'Limited'])
          .optional(),
      })
      .optional(),

    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    meta: z
      .object({
        isFeatured: z.boolean().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
      })
      .optional(),
  }),
});

// approveProductValidationSchema
const approveProductValidationSchema = z.object({
  body: z.object({
    isApproved: z.boolean({ required_error: 'isApproved is required' }),
    remarks: z.string().optional(),
  }),
});

export const ProductValidation = {
  createProductValidationSchema,
  updateProductValidationSchema,
  approveProductValidationSchema,
};
