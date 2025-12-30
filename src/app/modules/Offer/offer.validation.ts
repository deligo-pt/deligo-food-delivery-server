import mongoose from 'mongoose';
import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
  });

// Create Offer Validation Schema
const createOfferValidation = z.object({
  body: z.object({
    title: z.string(),
    description: z.string().optional(),

    offerType: z.enum(['PERCENT', 'FLAT', 'FREE_DELIVERY', 'BOGO']),

    discountValue: z.number().optional(),
    maxDiscountAmount: z.number().optional(),

    bogo: z
      .object({
        buyQty: z.number(),
        getQty: z.number(),
        itemId: z.string(),
      })
      .optional(),

    startDate: z.string(),
    endDate: z.string(),

    vendorId: z.string().nullable().optional(),
    minOrderAmount: z.number().optional(),

    isAutoApply: z.boolean(),
    code: z.string().optional(),

    maxUsageCount: z.number().optional(),
    limitPerUser: z.number().optional(),

    isActive: z.boolean().optional(),
  }),
});

// Update Offer Validation Schema
const updateOfferValidation = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),

    offerType: z.enum(['PERCENT', 'FLAT', 'FREE_DELIVERY', 'BOGO']).optional(),

    discountValue: z.number().optional(),
    maxDiscountAmount: z.number().optional(),

    bogo: z
      .object({
        buyQty: z.number(),
        getQty: z.number(),
        itemId: z.string(),
      })
      .optional(),

    startDate: z.string().optional(),
    endDate: z.string().optional(),

    minOrderAmount: z.number().optional(),

    isAutoApply: z.boolean().optional(),
    code: z.string().optional(),

    maxUsageCount: z.number().optional(),
    limitPerUser: z.number().optional(),

    isActive: z.boolean().optional(),
  }),
});

const getApplicableOfferValidation = z.object({
  body: z.object({
    vendorId: objectIdSchema,
    subtotal: z.number().positive('Subtotal must be greater than 0'),

    offerCode: z.string().trim().min(1).optional(),
  }),
});

export const OfferValidation = {
  createOfferValidation,
  updateOfferValidation,
  getApplicableOfferValidation,
};
