import { z } from 'zod';

// createProductValidationSchema
const createProductValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required'),
    description: z.string({ required_error: 'Description is required' }),

    category: z.string().min(1, 'Category is required'),
    subCategory: z.string().optional(),
    brand: z.string().optional(),

    pricing: z.object({
      price: z.number().min(0, 'Price must be positive'),
      discount: z.number().min(0).max(100).default(0),
      tax: z.number().min(0).max(100).default(0),
      finalPrice: z.number().optional(),
      currency: z.string().default('EUR'),
    }),

    stock: z.object({
      quantity: z.number().min(0, 'Quantity must be non-negative'),
      unit: z.string().optional(),
      availabilityStatus: z
        .enum(['In Stock', 'Out of Stock', 'Limited'])
        .default('In Stock'),
    }),

    // images: z.array(z.string()).nonempty('At least one image is required'),

    vendor: z
      .object({
        vendorName: z.string().optional(),
        vendorType: z.string().optional(),
        rating: z.number().optional(),
      })
      .optional(),

    tags: z.array(z.string()).optional(),

    deliveryInfo: z
      .object({
        deliveryType: z.enum(['Instant', 'Scheduled', 'Pickup']).optional(),
        estimatedTime: z.string().optional(),
        deliveryCharge: z.number().optional(),
        freeDeliveryAbove: z.number().optional(),
      })
      .optional(),

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

    rating: z
      .object({
        average: z.number().min(0).max(5).optional(),
        totalReviews: z.number().optional(),
      })
      .optional(),

    meta: z
      .object({
        isFeatured: z.boolean().default(false),
        isAvailableForPreOrder: z.boolean().default(false),
        status: z.enum(['Active', 'Inactive']).default('Active'),
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

    pricing: z
      .object({
        price: z.number().min(0, 'Price must be positive').optional(),
        discount: z.number().min(0).max(100).optional(),
        tax: z.number().min(0).max(100).optional(),
        finalPrice: z.number().optional(),
        currency: z.string().optional(),
      })
      .strict()
      .optional(),

    stock: z
      .object({
        quantity: z.number().min(0, 'Quantity must be non-negative').optional(),
        unit: z.string().optional(),
        availabilityStatus: z
          .enum(['In Stock', 'Out of Stock', 'Limited'])
          .optional(),
      })
      .optional(),

    images: z.array(z.string()).optional(),

    tags: z.array(z.string()).optional(),

    deliveryInfo: z
      .object({
        deliveryType: z.enum(['Instant', 'Scheduled', 'Pickup']).optional(),
        estimatedTime: z.string().optional(),
        deliveryCharge: z.number().optional(),
        freeDeliveryAbove: z.number().optional(),
      })
      .optional(),

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
        isFeatured: z.boolean().optional(),
        isAvailableForPreOrder: z.boolean().optional(),
        status: z.enum(['Active', 'Inactive']).optional(),
        origin: z.string().optional(),
      })
      .optional(),
  }),
});

export const ProductValidation = {
  createProductValidationSchema,
  updateProductValidationSchema,
};
