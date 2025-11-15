import { z } from 'zod';

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

export const OfferValidation = {
  createOfferValidation,
};
