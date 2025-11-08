import { z } from 'zod';

export const createOrderValidationSchema = z.object({
  body: z.object({
    // Items
    items: z
      .array(
        z.object({
          productId: z.string().min(1, 'Product ID is required'),
          name: z.string().min(1, 'Product name is required'),
          quantity: z.number().min(1, 'Quantity must be at least 1'),
          price: z.number().min(0, 'Price must be positive'),
          subtotal: z.number().min(0, 'Subtotal must be positive'),
        })
      )
      .nonempty('At least one product is required'),

    // Pricing & Payment
    totalPrice: z.number().min(0, 'Total price must be a positive number'),
    discount: z.number().min(0).optional(),
    finalAmount: z.number().min(0).optional(),
    paymentMethod: z.enum(['card', 'mobile']),
    paymentStatus: z
      .enum(['pending', 'completed', 'failed', 'refunded'])
      .default('pending'),

    // Order Lifecycle
    orderStatus: z
      .enum([
        'pending',
        'accepted',
        'rejected',
        'assigned',
        'pickedUp',
        'onTheWay',
        'delivered',
        'canceled',
      ])
      .default('pending'),

    remarks: z.string().optional(),

    // OTP
    deliveryOtp: z.string().optional(),
    isOtpVerified: z.boolean().optional(),

    // Delivery Address
    deliveryAddress: z.object({
      street: z.string().min(1, 'Street is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().min(1, 'Country is required'),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }),

    // Pickup Address (Vendor location)
    pickupAddress: z
      .object({
        street: z.string().min(1, 'Street is required'),
        city: z.string().min(1, 'City is required'),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
      .optional(),

    // Delivery Details
    deliveryCharge: z.number().min(0).optional(),
    estimatedDeliveryTime: z.string().optional(),

    // Flags
    isPaid: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
  }),
});

export const OrderValidation = {
  createOrderValidationSchema,
};
