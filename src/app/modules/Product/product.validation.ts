import { z } from 'zod';

// মাল্টি-ল্যাঙ্গুয়েজ (EN/PT) এর জন্য রিইউজেবল স্কিমা
const localizedStringSchema = z
  .object({
    en: z.string().min(1, 'English text is required'),
    pt: z.string().min(1, 'Portuguese text is required'),
  })
  .strict();

// Variation Options Schema (e.g., Small, Medium, Large)
const variationOptionSchema = z
  .object({
    label: localizedStringSchema, // আপডেট: string থেকে localized অবজেক্ট
    price: z.number().min(0, 'Variation price must be non-negative'),
    sku: z.string().optional(),
    stockQuantity: z
      .number({ required_error: 'Variation stock quantity is required' })
      .min(0)
      .optional(),
    isOutOfStock: z.boolean().default(false),
  })
  .strict();

// Variation Group Schema (e.g., Size, Color)
const variationSchema = z
  .object({
    name: localizedStringSchema, // আপডেট: string থেকে localized অবজেক্ট
    options: z
      .array(variationOptionSchema)
      .min(1, 'At least one option is required'),
  })
  .strict();

// createProductValidationSchema
const createProductValidationSchema = z.object({
  body: z
    .object({
      name: localizedStringSchema, // আপডেট: string থেকে localized অবজেক্ট
      description: localizedStringSchema, // আপডেট: string থেকে localized অবজেক্ট
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
          price: z.number().min(0, 'Price must be non-negative'), // রিকোয়ার্ড এবং পজিটিভ করা ভালো
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
      name: localizedStringSchema.partial().optional(), // আপডেট: en বা pt যেকোনো একটিও আপডেট করা যাবে
      description: localizedStringSchema.partial().optional(), // আপডেট
      category: z.string().optional(),
      subCategory: z.string().optional(),
      brand: z.string().optional(),

      addonGroups: z.array(z.string()).optional(),

      pricing: z
        .object({
          price: z.number().min(0).optional(), // প্রোডাক্ট আপডেটে প্রাইজ চেঞ্জ করার অপশন রাখা হলো
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
      name: localizedStringSchema, // আপডেট
      options: z
        .array(
          z
            .object({
              label: localizedStringSchema, // আপডেট
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
            })
            .strict(),
        )
        .min(1, 'At least one option must be provided'),
    })
    .strict(),
});

const renameVariationValidationSchema = z.object({
  body: z
    .object({
      oldName: localizedStringSchema.optional(), // আপডেট: গ্রুপ রিনেমের জন্য ওল্ড নেম অবজেক্ট হতে পারে

      newName: localizedStringSchema.optional(), // আপডেট

      oldLabel: localizedStringSchema.optional(), // আপডেট: অপশন রিনেমের জন্য

      newLabel: localizedStringSchema.optional(), // আপডেট
    })
    .strict()
    .refine(
      (data) => {
        const isRenamingGroup = !!data.newName && !!data.oldName;
        const isRenamingOption = !!(data.oldLabel && data.newLabel);
        return isRenamingGroup || isRenamingOption;
      },
      {
        message:
          "You must provide both 'oldName' and 'newName' to rename the group, or both 'oldLabel' and 'newLabel' to rename an option.",
        path: ['newName'],
      },
    ),
});

// removeVariationValidationSchema
const removeVariationValidationSchema = z.object({
  body: z
    .object({
      name: localizedStringSchema, // আপডেট: ভেরিয়েশন রিমুভের জন্য অবজেক্ট ম্যাচিং লাগতে পারে (বা নির্দিষ্ট ল্যাঙ্গুয়েজ কী)
      labelToRemove: localizedStringSchema.optional(), // আপডেট
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
    .strict(),
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
