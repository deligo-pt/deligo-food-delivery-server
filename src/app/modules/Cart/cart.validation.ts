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
            variationSku: z.string().optional().nullable(),
          })
          .strict(),
      ),
    })
    .strict(),
});

const activateItemValidationSchema = z.object({
  body: z
    .object({
      variationSku: z.string().optional().nullable(),
    })
    .strict(),
});

// update cart quantity validation
const updateCartItemQuantityValidationSchema = z.object({
  body: z
    .object({
      productId: z.string({
        required_error: 'Product Id is required',
      }),
      variationSku: z.string().optional().nullable(),

      quantity: z.number().min(1, 'Quantity must be at least 1').default(1),

      action: z.enum(['increment', 'decrement'], {
        required_error:
          'Action is required and must be either increment or decrement',
      }),
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
      optionId: z.string({
        required_error: 'Add-on option ID is required',
      }),
      action: z.enum(['increment', 'decrement'], {
        required_error: 'Action is required',
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
  activateItemValidationSchema,
  updateCartItemQuantityValidationSchema,
  updateAddonQuantityValidationSchema,
  deleteCartItemValidationSchema,
};
