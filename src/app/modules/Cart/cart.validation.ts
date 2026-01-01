import { z } from 'zod';

// Zod Validation Schema for cart
const addToCartValidationSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        productId: z.string({ required_error: 'Product ID is required' }),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        variantName: z.string().optional(),
        addons: z
          .array(
            z.object({
              addOnId: z.string(),
              quantity: z.number().min(1),
            })
          )
          .optional(),
      })
    ),
  }),
});

// update cart quantity validation
const updateCartItemQuantityValidationSchema = z.object({
  body: z.object({
    productId: z.string({ required_error: 'Product ID is required' }),
    variantName: z.string().optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1').optional(),
    action: z.enum(['increment', 'decrement'], {
      required_error: 'Action is required',
    }),
  }),
});

// delete cart item validation
const deleteCartItemValidationSchema = z.object({
  body: z
    .array(
      z.object({
        productId: z.string({
          required_error: 'Product ID is required',
        }),
        variantName: z.string().optional().nullable(),
      })
    )
    .min(1, 'At least one item must be provided to delete'),
});

const updateCartItemAddonsValidationSchema = z.object({
  body: z.object({
    productId: z.string({
      required_error: 'Product ID is required',
    }),
    variantName: z.string().optional(),
    addons: z
      .array(
        z.object({
          optionId: z.string({
            required_error: 'Add-on option ID is required',
          }),
          quantity: z
            .number({
              required_error: 'Add-on quantity is required',
            })
            .min(1, 'Quantity must be at least 1'),
        })
      )
      .min(1, 'At least one add-on must be provided')
      .default([]),
  }),
});

export const CartValidation = {
  addToCartValidationSchema,
  updateCartItemQuantityValidationSchema,
  deleteCartItemValidationSchema,
  updateCartItemAddonsValidationSchema,
};
