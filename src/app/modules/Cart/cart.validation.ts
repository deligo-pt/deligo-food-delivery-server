import mongoose from 'mongoose';
import { z } from 'zod';

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
  });

const viewCartAllowedQueryFields: readonly string[] = [
  'customerId',
  'vendorId',
];

// Zod Validation Schema for cart
const addToCartValidationSchema = z.object({
  body: z
    .object({
      items: z.array(
        z
          .object({
            productId: objectIdSchema,
            quantity: z.number().min(1, 'Quantity must be at least 1'),
            variationSku: z.string().optional(),
          })
          .strict(),
      ),
    })
    .strict(),
});

const toggleCartItemStatusValidationSchema = z.object({
  body: z
    .object({
      toggleMode: z.enum(['ITEM_LEVEL', 'VENDOR_BULK'], {
        required_error: 'Toggle mode is required',
        invalid_type_error:
          'Toggle mode must be either ITEM_LEVEL or VENDOR_BULK',
      }),
      vendorId: objectIdSchema.optional(),
      productIds: z.array(objectIdSchema).optional(),
      variationSku: z.array(z.string()).optional(),
    })
    .strict(),
});

const updateAddonQuantityValidationSchema = z.object({
  body: z
    .object({
      productId: objectIdSchema,
      variationSku: z.string().optional(),
      optionSku: z.string({
        required_error: 'Add-on option SKU is required',
      }),
      quantity: z.number({
        required_error: 'Quantity is required',
        invalid_type_error: 'Quantity must be a number',
      }),
    })
    .strict(),
});

// delete cart item validation
const deleteCartItemValidationSchema = z.object({
  body: z
    .array(
      z
        .object({
          productId: objectIdSchema,
          variationSku: z.string().optional().nullable(),
        })
        .strict(),
    )
    .min(1, 'At least one item must be provided to delete'),
});

const viewCartValidationSchema = z.object({
  query: z
    .object({
      customerId: objectIdSchema.optional(),
      vendorId: objectIdSchema.optional(),
    })
    .passthrough()
    .superRefine((query, ctx) => {
      const unknownKeys = Object.keys(query).filter(
        (key) => !viewCartAllowedQueryFields.includes(key),
      );

      if (unknownKeys.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unrecognized key(s) in object: '${unknownKeys.join("', '")}'. Allowed query fields: ${viewCartAllowedQueryFields.join(', ')}`,
        });
      }
    })
    .transform((query) => ({
      customerId: query.customerId,
      vendorId: query.vendorId,
    })),
});

export const CartValidation = {
  addToCartValidationSchema,
  toggleCartItemStatusValidationSchema,
  updateAddonQuantityValidationSchema,
  deleteCartItemValidationSchema,
  viewCartValidationSchema,
};
