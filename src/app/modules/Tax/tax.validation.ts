import { z } from 'zod';

const createTaxValidationSchema = z.object({
  body: z.object({
    taxName: z
      .string({
        required_error: 'Tax name is required',
      })
      .trim(),

    taxCode: z.enum(['NOR', 'INT', 'RED', 'ISE'], {
      required_error: 'Tax code must be one of: NOR, INT, RED, ISE',
    }),

    taxRate: z
      .union([z.literal(6), z.literal(13), z.literal(23), z.literal(0)])
      .refine((val) => [6, 13, 23, 0].includes(val), {
        message: 'Tax rate must be 6, 13, 23, or 0',
      }),

    countryID: z
      .string({
        required_error: 'Country ID is required',
      })
      .default('PRT')
      .transform((val) => val.toUpperCase()),

    TaxRegionID: z.string().default('PRT').optional(),

    taxGroupID: z.string().default('IVA'),

    description: z
      .string({
        required_error: 'Description is required for tax compliance',
      })
      .min(10, 'Description should be at least 10 characters long'),

    taxExemptionCode: z.string().optional(),

    taxExemptionReason: z.string().optional(),

    isActive: z.boolean().default(true),
  }),
});

export const TaxValidations = {
  createTaxValidationSchema,
};
