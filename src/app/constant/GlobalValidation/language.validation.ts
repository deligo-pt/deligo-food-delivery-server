import z from 'zod';

export const localizedValidationSchema = z.object({
  en: z
    .string({ required_error: 'English name is required' })
    .min(2, 'English name must be at least 2 characters'),
  pt: z
    .string({ required_error: 'Portuguese name is required' })
    .min(2, 'Portuguese name must be at least 2 characters'),
});
