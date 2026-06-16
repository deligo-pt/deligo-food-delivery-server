import { z } from 'zod';
const initiateAgreementValidationSchema = z.object({
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

      contactNumber: z
        .string({
          required_error: 'Contact number is required',
        })
        .min(1, 'Contact number is required'),

      nif: z
        .string({
          required_error: 'NIF is required',
        })
        .min(1, 'NIF is required'),
    })
    .strict(),
});

const verifyAgreementOtpValidationSchema = z.object({
  body: z
    .object({
      email: z
        .string({
          required_error: 'Email is required',
        })
        .email('Invalid email address'),

      otp: z
        .string({
          required_error: 'OTP is required',
        })
        .min(1, 'OTP is required'),
    })
    .strict(),
});

const resendAgreementOtpValidationSchema = z.object({
  body: z
    .object({
      email: z
        .string({
          required_error: 'Email is required',
        })
        .email('Invalid email address'),
    })
    .strict(),
});

const signAgreementValidationSchema = z.object({
  body: z
    .object({
      agentSignature: z
        .string({
          required_error: 'Agent signature image is required',
        })
        .startsWith(
          'data:image/',
          'Agent signature must be a valid Base64 image',
        ),
      establishmentSignature: z
        .string({
          required_error: 'Establishment signature image is required',
        })
        .startsWith(
          'data:image/',
          'Establishment signature must be a valid Base64 image',
        ),
    })
    .strict(),
});

export const AgreementValidation = {
  initiateAgreementValidationSchema,
  verifyAgreementOtpValidationSchema,
  resendAgreementOtpValidationSchema,
  signAgreementValidationSchema,
};
