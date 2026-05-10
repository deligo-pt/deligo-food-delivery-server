import { z } from 'zod';
const generateAgreementValidationSchema = z.object({
  body: z
    .object({
      establishmentName: z
        .string({
          required_error: 'Establishment name is required',
        })
        .min(1, 'Establishment name is required'),

      email: z
        .string({
          required_error: 'Email is required',
        })
        .email('Invalid email address'),

      phone: z
        .string({
          required_error: 'Phone is required',
        })
        .min(1, 'Phone is required'),

      nif: z
        .string({
          required_error: 'NIF is required',
        })
        .min(1, 'NIF is required'),
    })
    .strict(),
});

const signAgreementValidationSchema = z.object({
  body: z
    .object({
      agreementId: z
        .string({
          required_error: 'Agreement ID is required',
        })
        .min(1, 'Agreement ID is required'),

      signatureImage: z
        .string({
          required_error: 'Signature image is required',
        })
        .startsWith('data:image/', 'Signature must be a valid Base64 image'),
    })
    .strict(),
});

export const AgreementValidation = {
  generateAgreementValidationSchema,
  signAgreementValidationSchema,
};
