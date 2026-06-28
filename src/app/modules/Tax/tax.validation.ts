/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { createLocalizedValidationSchema } from '../../constant/GlobalValidation/language.validation';

const TAX_RATES = [0, 6, 13, 23] as const;
const TAX_CODES = ['NOR', 'INT', 'RED', 'ISE'] as const;

const TAX_MAPPING: Record<string, number> = {
  NOR: 23,
  INT: 13,
  RED: 6,
  ISE: 0,
};

const createTaxBodySchema = z
  .object({
    taxName: createLocalizedValidationSchema('tax name'),
    description: createLocalizedValidationSchema('tax description'),
    taxCode: z.enum(TAX_CODES),
    taxRate: z
      .number()
      .refine((val) => (TAX_RATES as unknown as number[]).includes(val), {
        message: `Tax rate must be one of: ${TAX_RATES.join(', ')}`,
      }),
    countryID: z
      .string()
      .default('PRT')
      .transform((val) => val.toUpperCase()),
    TaxRegionID: z.string().default('PRT').optional(),
    taxGroupID: z.string().default('IVA'),
    taxExemptionCode: z.string().optional(),
    taxExemptionReason: createLocalizedValidationSchema(
      'tax exemption reason',
      true,
    ).optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

const updateTaxBodySchema = createTaxBodySchema
  .extend({
    taxName: createLocalizedValidationSchema('tax name', true).optional(),
    description: createLocalizedValidationSchema(
      'tax description',
      true,
    ).optional(),
    taxExemptionReason: createLocalizedValidationSchema(
      'tax exemption reason',
      true,
    ).optional(),
  })
  .partial();

const createTaxLogicRefine = (data: any, ctx: z.RefinementCtx) => {
  if (data.taxCode && data.taxRate !== undefined) {
    const expectedRate = TAX_MAPPING[data.taxCode];
    if (data.taxRate !== expectedRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid rate for ${data.taxCode}. Expected ${expectedRate}% but got ${data.taxRate}%`,
        path: ['taxRate'],
      });
    }
  }

  if (data.taxRate === 0) {
    const hasReason =
      data.taxExemptionReason &&
      (data.taxExemptionReason.en || data.taxExemptionReason.pt);
    if (!data.taxExemptionCode || !hasReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Tax exemption code and localized reason are required when tax rate is 0',
        path: ['taxExemptionCode'],
      });
    }
  }
};

const updateTaxLogicRefine = (data: any, ctx: z.RefinementCtx) => {
  if (data.taxCode && data.taxRate !== undefined) {
    const expectedRate = TAX_MAPPING[data.taxCode];
    if (data.taxRate !== expectedRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid rate for ${data.taxCode}. Expected ${expectedRate}% but got ${data.taxRate}%`,
        path: ['taxRate'],
      });
    }
  }

  if (data.taxRate === 0) {
    if (!data.taxExemptionCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tax exemption code is required when updating tax rate to 0',
        path: ['taxExemptionCode'],
      });
    }
  }
};

const createTaxValidationSchema = z
  .object({
    body: createTaxBodySchema.superRefine(createTaxLogicRefine),
  })
  .strict();

const updateTaxValidationSchema = z
  .object({
    body: updateTaxBodySchema.superRefine(updateTaxLogicRefine),
  })
  .strict();

export const TaxValidations = {
  createTaxValidationSchema,
  updateTaxValidationSchema,
};
