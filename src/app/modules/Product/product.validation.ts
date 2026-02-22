import { z } from 'zod';

// Variation Options Schema (e.g., Small, Medium, Large)
const variationOptionSchema = z.object({
  label: z.string({ required_error: 'Variation label is required' }),
  price: z.number().min(0, 'Variation price must be non-negative'),
  sku: z.string().optional(),
  stockQuantity: z
    .number({ required_error: 'Variation stock quantity is required' })
    .min(0),
  isOutOfStock: z.boolean().default(false),
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
      price: z.number().optional(),
      discount: z.number().min(0).max(100).default(0),
      taxId: z.string({ required_error: 'Tax ID is required' }),
      currency: z.string().default('EUR'),
    }),

    stock: z.object({
      quantity: z.number().min(0, 'Quantity must be non-negative').optional(),
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
        ]),
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

    addonGroups: z.array(z.string()).optional(),

    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    attributes: z.record(z.any()).optional(),
    meta: z
      .object({
        isFeatured: z.boolean().optional(),
        isAvailableForPreOrder: z.boolean().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
      })
      .optional(),
  }),
});

// manageVariationValidationSchema
const manageVariationValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'Variation group name is required',
      })
      .min(1, 'Name cannot be empty')
      .trim(),
    options: z
      .array(
        z.object({
          label: z
            .string({
              required_error: 'Option label is required (e.g., Small, Red)',
            })
            .min(1)
            .trim(),
          price: z
            .number({
              required_error: 'Price is required',
            })
            .min(0, 'Price cannot be negative'),
          sku: z.string().optional(),
          stockQuantity: z
            .number()
            .min(0, 'Stock cannot be negative')
            .default(0),
        }),
      )
      .min(1, 'At least one option must be provided'),
  }),
});

const renameVariationValidationSchema = z.object({
  body: z
    .object({
      oldName: z
        .string({
          required_error: 'Current variation group name (oldName) is required',
        })
        .min(1, 'Old name cannot be empty'),

      newName: z.string().optional(),

      oldLabel: z.string().optional(),

      newLabel: z.string().optional(),
    })
    .refine(
      (data) => {
        const isRenamingGroup = !!data.newName;

        const isRenamingOption = !!(data.oldLabel && data.newLabel);

        return isRenamingGroup || isRenamingOption;
      },
      {
        message:
          "You must provide 'newName' to rename the group, or both 'oldLabel' and 'newLabel' to rename an option.",
        path: ['newName'],
      },
    ),
});

// removeVariationValidationSchema
const removeVariationValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'Variation name is required',
      })
      .min(1, 'Variation name cannot be empty'),

    labelToRemove: z.string().optional(),
  }),
});

// updateStockAndPriceValidationSchema
const updateStockAndPriceValidationSchema = z.object({
  body: z
    .object({
      addedQuantity: z.number().optional(),
      reduceQuantity: z.number().min(1).optional(),
      newPrice: z.number().min(0, 'Price cannot be negative').optional(),
      variationSku: z.string().optional(),
    })
    .refine((data) => !(data.addedQuantity && data.reduceQuantity), {
      message:
        'You cannot provide both addedQuantity and reduceQuantity at the same time',
      path: ['addedQuantity'],
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
  manageVariationValidationSchema,
  renameVariationValidationSchema,
  removeVariationValidationSchema,
  updateStockAndPriceValidationSchema,
  approveProductValidationSchema,
};
