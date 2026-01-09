import { z } from 'zod';

// Create Rating Validation Schema
const createRatingValidationSchema = z.object({
  body: z.object({
    ratingType: z.enum(['DELIVERY_PARTNER', 'PRODUCT', 'FLEET_MANAGER']),
    rating: z
      .number()
      .min(1, { message: 'Rating must be at least 1' })
      .max(5, { message: 'Rating cannot exceed 5' }),
    review: z.string().optional().default(''),

    reviewerId: z
      .string({ required_error: 'Reviewer ID is required' })
      .optional(),
    reviewerModel: z
      .enum(['Customer', 'Vendor', 'FleetManager', 'DeliveryPartner'])
      .optional(),

    targetId: z.string({ required_error: 'Target ID is required' }).optional(),
    targetModel: z
      .enum([
        'Customer',
        'Vendor',
        'FleetManager',
        'DeliveryPartner',
        'Product',
      ])
      .optional(),

    orderId: z.string({ required_error: 'Order ID is required for tracking' }),
    productId: z.string().optional(),

    tags: z.array(z.string()).optional().default([]),
  }),
});

export const RatingValidation = {
  createRatingValidationSchema,
};
