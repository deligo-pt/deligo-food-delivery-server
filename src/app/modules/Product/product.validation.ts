import { z } from 'zod';
import { localizedValidationSchema } from '../../constant/GlobalValidation/language.validation';

// Variation Options Schema (e.g., Small, Medium, Large)
const variationOptionSchema = z
  .object({
    label: localizedValidationSchema,
    price: z.number().min(0, 'Variation price must be non-negative'),
    sku: z.string().optional(),
    stockQuantity: z.number().min(0).optional(),
    isOutOfStock: z.boolean().default(false),
  })
  .strict();

// Variation Group Schema (e.g., Size, Color)
const variationSchema = z
  .object({
    name: localizedValidationSchema,
    options: z
      .array(variationOptionSchema)
      .min(1, 'At least one option is required'),
  })
  .strict();

// createProductValidationSchema
const createProductValidationSchema = z.object({
  body: z
    .object({
      name: localizedValidationSchema,
      description: localizedValidationSchema,
      category: z.string().min(1, 'Category is required'),
      subCategory: z.string().optional(),
      brand: z.string().optional(),

      variations: z.array(variationSchema).optional(),
      addonGroups: z.array(z.string()).optional(),
      images: z
        .array(z.string().url())
        .min(1, 'At least one image is required'),

      pricing: z
        .object({
          price: z.number().min(0, 'Price must be non-negative'),
          discount: z.number().min(0).max(100).default(0),
          taxId: z.string({ required_error: 'Tax ID is required' }),
          currency: z.string().default('EUR'),
        })
        .strict(),

      stock: z
        .object({
          quantity: z.number().min(0, 'Quantity must be non-negative'),
          unit: z.string().optional(),
          availabilityStatus: z
            .enum(['In Stock', 'Out of Stock', 'Limited'])
            .default('In Stock'),
        })
        .strict()
        .optional(),

      meta: z
        .object({
          isFeatured: z.boolean().default(false),
          isAvailableForPreOrder: z.boolean().default(false),
          status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
          origin: z.string().optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
});

// updateProductValidationSchema
const updateProductValidationSchema = z.object({
  body: z
    .object({
      name: localizedValidationSchema.partial().optional(),
      description: localizedValidationSchema.partial().optional(),
      category: z.string().optional(),
      subCategory: z.string().optional(),
      brand: z.string().optional(),

      addonGroups: z.array(z.string()).optional(),

      pricing: z
        .object({
          price: z.number().min(0).optional(),
          discount: z.number().min(0).max(100).optional(),
          taxId: z.string().optional(),
          currency: z.string().optional(),
        })
        .strict()
        .optional(),

      stock: z
        .object({
          unit: z.string().optional(),
        })
        .strict()
        .optional(),

      images: z.array(z.string().url()).optional(),
      meta: z
        .object({
          isFeatured: z.boolean().optional(),
          isAvailableForPreOrder: z.boolean().optional(),
          status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
});

// manageVariationValidationSchema
const manageVariationValidationSchema = z.object({
  body: z
    .object({
      name: localizedValidationSchema,
      options: z
        .array(
          z
            .object({
              label: localizedValidationSchema,
              price: z
                .number({
                  required_error: 'Price is required',
                })
                .min(0, 'Price cannot be negative'),
              sku: z.string().optional(),
              stockQuantity: z
                .number()
                .min(0, 'Stock cannot be negative')
                .optional(),
            })
            .strict(),
        )
        .min(1, 'At least one option must be provided'),
    })
    .strict(),
});

// renameVariationValidationSchema
const renameVariationValidationSchema = z.object({
  body: z
    .object({
      oldName: z.string().min(1, 'Old variation name is required'),

      newName: localizedValidationSchema.partial().optional(),

      oldLabel: z.string().optional(),
      newLabel: localizedValidationSchema.partial().optional(),
    })
    .strict()
    .refine(
      (data) => {
        const isRenamingGroup =
          !!data.newName && (!!data.newName.en || !!data.newName.pt);

        const isRenamingOption =
          !!data.oldLabel &&
          !!data.newLabel &&
          (!!data.newLabel.en || !!data.newLabel.pt);

        return isRenamingGroup || isRenamingOption;
      },
      {
        message:
          "You must provide at least one field (en/pt) inside 'newName' to rename the group, or 'oldLabel' along with at least one field inside 'newLabel' to rename an option.",
        path: ['newName'],
      },
    ),
});

// removeVariationValidationSchema
const removeVariationValidationSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, 'Variation name is required'),
      labelToRemove: z.string().optional(),
    })
    .strict(),
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
    .strict()
    .refine((data) => !(data.addedQuantity && data.reduceQuantity), {
      message:
        'You cannot provide both addedQuantity and reduceQuantity at the same time',
      path: ['addedQuantity'],
    }),
});

// approveProductValidationSchema
const approveProductValidationSchema = z.object({
  body: z
    .object({
      isApproved: z.boolean({ required_error: 'isApproved is required' }),
      remarks: z.string().optional(),
    })
    .strict()
    .refine(
      (data) => {
        if (
          data.isApproved === false &&
          (!data.remarks || data.remarks.trim() === '')
        ) {
          return false;
        }
        return true;
      },
      {
        message: 'Remarks are required when rejecting a product',
        path: ['remarks'],
      },
    ),
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
