import { z } from 'zod';

// Zod Validation Schema for cart
const addToCartValidationSchema = z.object({
  body: z
    .object({
      items: z.array(
        z
          .object({
            productId: z.string({ required_error: 'Product ID is required' }),
            quantity: z
              .number()
              .min(1, 'Quantity must be at least 1')
              .optional(),
            variationSku: z.string().optional(),
            addons: z
              .array(
                z
                  .object({
                    optionSku: z.string({
                      required_error: 'Add-on option SKU is required',
                    }),
                    quantity: z
                      .number({ required_error: 'Add-on quantity is required' })
                      .min(0, 'Add-on quantity cannot be negative'),
                  })
                  .strict(),
              )
              .optional(),
          })
          .strict(),
        { required_error: 'Cart items are required' },
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
      vendorId: z.string().optional(),
      productIds: z.array(z.string()).optional(),
      variationSku: z.array(z.string()).optional(),
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
      { required_error: 'Cart items to delete are required' },
    )
    .min(1, 'At least one item must be provided to delete'),
});

export const CartValidation = {
  addToCartValidationSchema,
  toggleCartItemStatusValidationSchema,
  updateAddonQuantityValidationSchema,
  deleteCartItemValidationSchema,
};
