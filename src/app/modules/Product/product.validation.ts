import { z } from 'zod';

// Zod Validation Schema for Product Creation
const createProductValidationSchema = z.object({
  body: z.object({
    // Basic Information
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),

    // Categorization
    category: z.string().min(1, 'Category is required'),
    subCategory: z.string().optional(),
    brand: z.string().optional(),
    productType: z.enum([
      'food',
      'grocery',
      'pharmacy',
      'electronics',
      'others',
    ]),

    // Pricing
    price: z.number().min(0, 'Price must be a positive number'),
    discount: z.number().min(0).max(100).default(0),
    currency: z.string().default('BDT'),

    // Stock Information
    stock: z.object({
      quantity: z.number().min(0, 'Quantity must be non-negative'),
      unit: z.string().optional(),
      availabilityStatus: z
        .enum(['In Stock', 'Out of Stock', 'Limited'])
        .default('In Stock'),
    }),

    // Tags
    tags: z.array(z.string()).optional(),

    // Delivery Info
    deliveryInfo: z
      .object({
        deliveryType: z.string().optional(),
        estimatedTime: z.string().optional(),
        deliveryCharge: z.number().optional(),
        freeDeliveryAbove: z.number().optional(),
      })
      .optional(),

    // Nutritional Info
    nutritionalInfo: z
      .object({
        calories: z.number().optional(),
        protein: z.string().optional(),
        fat: z.string().optional(),
        carbohydrates: z.string().optional(),
      })
      .optional(),

    // Attributes
    attributes: z
      .object({
        color: z.string().optional(),
        size: z.string().optional(),
        flavor: z.string().optional(),
        weight: z.string().optional(),
        expiryDate: z.string().optional(),
      })
      .optional(),

    // Ratings
    rating: z
      .object({
        average: z.number().min(0).max(5).optional(),
        totalReviews: z.number().optional(),
      })
      .optional(),

    // Meta Info
    meta: z
      .object({
        isFeatured: z.boolean().default(false),
        isAvailableForPreOrder: z.boolean().default(false),
        status: z.enum(['Active', 'Inactive']).default('Active'),
        origin: z.string().optional(),
        createdAt: z.date().optional(),
        updatedAt: z.date().optional(),
      })
      .optional(),
  }),
});

// updateProductValidationSchema
const updateProductValidationSchema = z.object({
  body: z.object({
    // Basic Information
    name: z.string().min(1, 'Product name is required').optional(),
    description: z.string().optional(),
    // Categorization
    category: z.string().min(1, 'Category is required').optional(),
    subCategory: z.string().optional(),
    brand: z.string().optional(),
    productType: z
      .enum(['food', 'grocery', 'pharmacy', 'electronics', 'others'])
      .optional(),
    // Pricing
    price: z.number().min(0, 'Price must be a positive number').optional(),
    discount: z.number().min(0).max(100).optional(),
    currency: z.string().optional(),
    // Stock Information
    stock: z.object({
      quantity: z.number().min(0, 'Quantity must be non-negative').optional(),
      unit: z.string().optional(),
      availabilityStatus: z
        .enum(['In Stock', 'Out of Stock', 'Limited'])
        .default('In Stock'),
    }),
    // Images
    images: z.array(z.string().url()).optional(),
    // Tags
    tags: z.array(z.string()).optional(),
    // Delivery Info
    deliveryInfo: z
      .object({
        deliveryType: z.string().optional(),
        estimatedTime: z.string().optional(),
        deliveryCharge: z.number().optional(),
        freeDeliveryAbove: z.number().optional(),
      })
      .optional(),
    // Nutritional Info
    nutritionalInfo: z
      .object({
        calories: z.number().optional(),
        protein: z.string().optional(),
        fat: z.string().optional(),
        carbohydrates: z.string().optional(),
      })
      .optional(),
    // Attributes
    attributes: z
      .object({
        color: z.string().optional(),
        size: z.string().optional(),
        flavor: z.string().optional(),
        weight: z.string().optional(),
        expiryDate: z.string().optional(),
      })
      .optional(),
    // Ratings
    rating: z
      .object({
        average: z.number().min(0).max(5).optional(),
        totalReviews: z.number().optional(),
      })
      .optional(),
    // Meta Info
    meta: z
      .object({
        isFeatured: z.boolean().optional(),
        isAvailableForPreOrder: z.boolean().optional(),
      })
      .optional(),
  }),
});

export const ProductValidation = {
  createProductValidationSchema,
  updateProductValidationSchema,
};
