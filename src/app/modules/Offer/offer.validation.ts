import mongoose from 'mongoose';
import { z } from 'zod';
import { createLocalizedValidationSchema } from '../../constant/GlobalValidation/language.validation';

export const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
  });

const offerBody = z
  .object({
    title: createLocalizedValidationSchema('offer title'),
    description: createLocalizedValidationSchema(
      'offer description',
      true,
    ).optional(),
    offerType: z.enum(['PERCENT', 'FLAT', 'FREE_DELIVERY', 'BOGO']),

    discountValue: z.number().nonnegative().optional(),
    maxDiscountAmount: z.number().nonnegative().optional(),

    bogo: z
      .object({
        buyQty: z.number().int().positive(),
        getQty: z.number().int().positive(),
        productId: objectIdSchema,
      })
      .strict()
      .optional(),

    validFrom: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid start date',
    }),
    expiresAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid end date',
    }),

    adminId: objectIdSchema.nullable().optional(),
    isGlobal: z.boolean().default(false),
    vendorId: objectIdSchema.nullable().optional(),
    minOrderAmount: z.number().nonnegative().default(0),

    applicableCategories: z.array(objectIdSchema).default([]),
    applicableProducts: z.array(objectIdSchema).default([]),

    isAutoApply: z.boolean().default(false),
    code: z.string().trim().toUpperCase().optional(),

    maxUsageCount: z.number().int().positive().optional(),
    usageCount: z.number().int().nonnegative().default(0),
    userUsageLimit: z.number().int().positive().default(1),

    isActive: z.boolean().default(true),
  })
  .strict();

const updateOfferBody = offerBody
  .extend({
    title: createLocalizedValidationSchema('offer title', true).optional(),
    description: createLocalizedValidationSchema(
      'offer description',
      true,
    ).optional(),
  })
  .partial();

// --- CREATE OFFER VALIDATION ---
const createOfferValidation = z
  .object({
    body: offerBody.superRefine((data, ctx) => {
      if (new Date(data.validFrom) >= new Date(data.expiresAt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expiration date must be after valid from date',
          path: ['expiresAt'],
        });
      }

      if (data.offerType === 'BOGO' && !data.bogo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'BOGO details (buyQty, getQty, productId) are required',
          path: ['bogo'],
        });
      }

      if (
        (data.offerType === 'PERCENT' || data.offerType === 'FLAT') &&
        (data.discountValue === undefined || data.discountValue === null)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Discount value is required for ${data.offerType} type`,
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
  })
  .strict();

// --- UPDATE OFFER VALIDATION ---
const updateOfferValidation = z
  .object({
    body: updateOfferBody,
  })
  .strict();

// --- APPLY OFFER SCHEMA ---
const applyOfferSchema = z.object({
  body: z
    .object({
      checkoutId: z
        .string({
          required_error: 'Checkout ID is required',
        })
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Checkout ID format'),

      offerIdentifier: z.string(),
    })
    .strict(),
});

export const OfferValidation = {
  createOfferValidation,
  updateOfferValidation,
  applyOfferSchema,
};
