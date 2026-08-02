import z from 'zod';

const RestrictedItemSchema = z.object({
  body: z
    .object({
      name: z
        .string({ required_error: 'Restricted item name is required' })
        .min(1, 'Restricted item name is required'),
      reason: z
        .string({ required_error: 'Restriction reason is required' })
        .min(1, 'Restriction reason is required'),
      category: z.enum(
        ['TOBACCO', 'ALCOHOL', 'ADULT_CONTENT', 'DANGEROUS_GOODS', 'OTHER'],
        { required_error: 'Category is required' },
      ),
    })
    .strict(),
});
const RestrictedItemUpdateSchema = z.object({
  body: z
    .object({
      name: z.string().optional(),
      reason: z.string().optional(),
      category: z
        .enum([
          'TOBACCO',
          'ALCOHOL',
          'ADULT_CONTENT',
          'DANGEROUS_GOODS',
          'OTHER',
        ])
        .optional(),
    })
    .strict(),
});

export const RestrictedItemValidation = {
  RestrictedItemSchema,
  RestrictedItemUpdateSchema,
};
