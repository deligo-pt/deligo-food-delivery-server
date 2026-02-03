import mongoose from 'mongoose';
import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
  });

const offerBody = z.object({
  title: z.string({ required_error: 'Title is required' }).min(3).trim(),
  description: z.string().optional(),
  offerType: z.enum(['PERCENT', 'FLAT', 'FREE_DELIVERY', 'BOGO']),

  discountValue: z.number().nonnegative().optional(),
  maxDiscountAmount: z.number().nonnegative().optional(),

  bogo: z
    .object({
      buyQty: z.number().int().positive(),
      getQty: z.number().int().positive(),
      productId: objectIdSchema,
    })
    .optional(),

  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start date',
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end date',
  }),

  vendorId: objectIdSchema.nullable().optional(),
  minOrderAmount: z.number().nonnegative().default(0),

  isAutoApply: z.boolean().default(false),
  code: z.string().trim().toUpperCase().optional(),

  maxUsageCount: z.number().int().positive().optional(),
  limitPerUser: z.number().int().positive().default(1),

  isActive: z.boolean().default(true),
});

// Create Offer Validation
const createOfferValidation = z.object({
  body: offerBody.superRefine((data, ctx) => {
    if (new Date(data.startDate) >= new Date(data.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be after start date',
        path: ['endDate'],
      });
    }

    if (data.offerType === 'BOGO' && !data.bogo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'BOGO details (buyQty, getQty, productId) are required for BOGO type',
        path: ['bogo'],
      });
    }

    if (
      (data.offerType === 'PERCENT' || data.offerType === 'FLAT') &&
      (data.discountValue === undefined || data.discountValue === null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Discount value is required for ${data.offerType} offers`,
        path: ['discountValue'],
      });
    }

    if (!data.isAutoApply && !data.code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Promo code is required when Auto-apply is disabled',
        path: ['code'],
      });
    }

    if (data.isAutoApply && data.code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Auto-apply offers should not have a promo code',
        path: ['code'],
      });
    }
  }),
});

// Update Offer Validation
const updateOfferValidation = z.object({
  body: offerBody.partial(),
});

// Applicable Offer Validation
const getApplicableOfferValidation = z.object({
  body: z.object({
    vendorId: objectIdSchema,
    subtotal: z.number().positive('Subtotal must be greater than 0'),
    offerCode: z.string().trim().min(1).optional(),
    cartItems: z.array(objectIdSchema).optional(),
  }),
});

const validatePromoCodeValidationSchema = z.object({
  body: z.object({
    promoCode: z
      .string({
        required_error: 'Promo code is required',
      })
      .min(1, 'Promo code cannot be empty')
      .trim()
      .toUpperCase(),

    vendorId: z
      .string({
        required_error: 'Vendor ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Vendor ID format'),

    subtotal: z
      .number({
        required_error: 'Subtotal is required',
        invalid_type_error: 'Subtotal must be a number',
      })
      .min(0, 'Subtotal cannot be negative'),
  }),
});

export const OfferValidation = {
  createOfferValidation,
  updateOfferValidation,
  getApplicableOfferValidation,
  validatePromoCodeValidationSchema,
};
