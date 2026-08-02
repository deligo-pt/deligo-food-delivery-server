import mongoose from 'mongoose';
import { z } from 'zod';
import { createLocalizedValidationSchema } from '../../constant/GlobalValidation/language.validation';

export const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Must be a valid ObjectId',
  });

const offerBody = z
  .object({
    title: createLocalizedValidationSchema('offer title'),
    description: createLocalizedValidationSchema(
      'offer description',
      true,
    ).optional(),
    offerType: z.enum(['PERCENT', 'FLAT', 'FREE_DELIVERY', 'BOGO'], {
      required_error: 'Offer type is required',
    }),

    discountValue: z
      .number()
      .nonnegative('Discount value must be non-negative')
      .optional(),
    maxDiscountAmount: z
      .number()
      .nonnegative('Max discount amount must be non-negative')
      .optional(),

    bogo: z
      .object({
        buyQty: z
          .number()
          .int('Buy quantity must be an integer')
          .positive('Buy quantity must be greater than 0'),
        getQty: z
          .number()
          .int('Get quantity must be an integer')
          .positive('Get quantity must be greater than 0'),
        productId: objectIdSchema,
      })
      .strict()
      .optional(),

    validFrom: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Valid from must be a valid date',
    }),
    expiresAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Expiration date must be a valid date',
    }),

    adminId: objectIdSchema.nullable().optional(),
    isGlobal: z.boolean().default(false),
    vendorId: objectIdSchema.nullable().optional(),
    minOrderAmount: z
      .number()
      .nonnegative('Minimum order amount must be non-negative')
      .default(0),

    applicableCategories: z.array(objectIdSchema).default([]),
    applicableProducts: z.array(objectIdSchema).default([]),

    isAutoApply: z.boolean().default(false),
    code: z.string().trim().toUpperCase().optional(),

    maxUsageCount: z
      .number()
      .int('Max usage count must be an integer')
      .positive('Max usage count must be greater than 0')
      .optional(),
    usageCount: z
      .number()
      .int('Usage count must be an integer')
      .nonnegative('Usage count must be non-negative')
      .default(0),
    userUsageLimit: z
      .number()
      .int('User usage limit must be an integer')
      .positive('User usage limit must be greater than 0')
      .default(1),

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

      offerIdentifier: z.string({
        required_error: 'Offer identifier is required',
      }),
    })
    .strict(),
});

export const OfferValidation = {
  createOfferValidation,
  updateOfferValidation,
  applyOfferSchema,
};
