import { z } from 'zod';

// Zod Validation Schema for cart
const addToCartValidationSchema = z.object({
  body: z
    .object({
      items: z.array(
        z
          .object({
            productId: z.string({ required_error: 'Product ID is required' }),
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
      variationSku: z
        .string({
          invalid_type_error: 'Variation SKU must be a string',
        })
        .optional(),
    })
    .strict(),
});

const updateAddonQuantityValidationSchema = z.object({
  body: z
    .object({
      productId: z.string({
        required_error: 'Product ID is required',
      }),
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
          productId: z.string({
            required_error: 'Product ID is required',
          }),
          variationSku: z.string().optional().nullable(),
        })
        .strict(),
    )
    .min(1, 'At least one item must be provided to delete'),
});

export const CartValidation = {
  addToCartValidationSchema,
  toggleCartItemStatusValidationSchema,
  updateAddonQuantityValidationSchema,
  deleteCartItemValidationSchema,
};
