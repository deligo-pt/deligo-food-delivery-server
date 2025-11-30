import { z } from 'zod';

// Zod Validation Schema for cart
const addToCartValidationSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
      })
    ),
  }),
});

// delete cart item validation
const deleteCartItemValidationSchema = z.object({
  body: z.object({
    productId: z.array(z.string(), {
      required_error: 'Product ID is required',
    }),
  }),
});

export const CartValidation = {
  addToCartValidationSchema,
  deleteCartItemValidationSchema,
};
