import { z } from 'zod';

const orderValidationSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
      })
    ),
    totalPrice: z.number().min(0, 'Total price must be a positive number'),
    paymentStatus: z.enum(['pending', 'completed', 'failed']),
    orderStatus: z.enum([
      'pending',
      'accepted',
      'assigned',
      'picked',
      'delivered',
      'canceled',
    ]),
    deliveryAddress: z.string().min(1, 'Delivery address is required'),
  }),
});

export const OrderValidation = {
  orderValidationSchema,
};
