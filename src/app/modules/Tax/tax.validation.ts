/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

const TAX_RATES = [0, 6, 13, 23] as const;
const TAX_CODES = ['NOR', 'INT', 'RED', 'ISE'] as const;

const baseTaxSchema = {
  taxName: z.string().trim(),
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
  description: z
    .string()
    .min(10, 'Description should be at least 10 characters long'),
  taxExemptionCode: z.string().optional(),
  taxExemptionReason: z.string().optional(),
  isActive: z.boolean().default(true),
};

const exemptionRefine = (data: any) => {
  if (data.taxRate === 0) {
    return !!data.taxExemptionCode && !!data.taxExemptionReason;
  }
  return true;
};

const exemptionMessage = {
  message: 'Tax exemption code and reason are required when tax rate is 0',
  path: ['taxExemptionCode'],
};

// Create Schema
const createTaxValidationSchema = z.object({
  body: z.object(baseTaxSchema).refine(exemptionRefine, exemptionMessage),
});

// Update Schema
const updateTaxValidationSchema = z.object({
  body: z
    .object(baseTaxSchema)
    .partial()
    .refine(exemptionRefine, exemptionMessage),
});

export const TaxValidations = {
  createTaxValidationSchema,
  updateTaxValidationSchema,
};
