import z from 'zod';

const RestrictedItemSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    reason: z.string().min(1, 'Reason is required'),
    category: z.enum([
      'TOBACCO',
      'ALCOHOL',
      'ADULT_CONTENT',
      'DANGEROUS_GOODS',
      'OTHER',
    ]),
  }),
});
const RestrictedItemUpdateSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    reason: z.string().optional(),
    category: z
      .enum(['TOBACCO', 'ALCOHOL', 'ADULT_CONTENT', 'DANGEROUS_GOODS', 'OTHER'])
      .optional(),
  }),
});
export const RestrictedItemValidation = {
  RestrictedItemSchema,
  RestrictedItemUpdateSchema,
};
