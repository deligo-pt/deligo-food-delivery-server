import z from 'zod';

// language.validation.ts
export const createLocalizedValidationSchema = (
  fieldName: string,
  isUpdate = false,
) => {
  const schema = z.object(
    {
      en: z
        .string({ required_error: `English ${fieldName} is required` })
        .min(2, `English ${fieldName} must be at least 2 characters`),
      pt: z
        .string({ required_error: `Portuguese ${fieldName} is required` })
        .min(2, `Portuguese ${fieldName} must be at least 2 characters`),
    },
    { required_error: `${fieldName} is required` },
  );

  return isUpdate ? schema.partial() : schema;
};
