import { z } from 'zod';
import { addressValidationSchema } from '../Admin/admin.validation';

const portugalPhoneRegex = /^(?:\+351|351)?9[1236]\d{7}$/;

// ---------------------------------------------
// User Profile Update Validation
// ---------------------------------------------
const userProfileUpdateValidationSchema = z.object({
  body: z
    .object({
      name: z
        .object({
          firstName: z.string({
            required_error: 'First name is required',
          }),
          lastName: z.string({
            required_error: 'Last name is required',
          }),
        })
        .strict()
        .optional(),

      contactNumber: z
        .string({
          required_error: 'Contact number is required',
        })
        .optional(),
      NIF: z.string().optional().nullable(),

      profilePhoto: z.string().nullable().optional(),

      address: addressValidationSchema.optional(),
    })
    .strict(),
});

const sendOtpValidationSchema = z.object({
  body: z
    .object({
      contactNumber: z
        .string({
          invalid_type_error: 'Contact number must be a string.',
        })
        .trim()
        .refine((val) => !val || portugalPhoneRegex.test(val), {
          message:
            'Only valid Portugal contact numbers are allowed (+351xxxxxxxxx).',
        })
        .optional(),

      email: z
        .string({
          invalid_type_error: 'Email must be a string.',
        })
        .trim()
        .email({ message: 'Invalid email address format.' })
        .optional(),
    })
    .strict()
    .refine((data) => data.contactNumber || data.email, {
      message: 'Either contact number or email must be provided.',
      path: ['contactNumber'],
    }),
});

const updateEmailOrContactNumberValidationSchema = z.object({
  body: z
    .object({
      otp: z
        .string({
          required_error: 'OTP is required.',
          invalid_type_error: 'OTP must be a string.',
        })
        .trim()
        .min(4, { message: 'OTP must be at least 4 digits.' })
        .max(6, { message: 'OTP cannot be more than 6 digits.' }),

      type: z.enum(['email', 'mobile'], {
        required_error: 'Type is required.',
        invalid_type_error: 'Type must be either "email" or "mobile".',
      }),
    })
    .strict(),
});

export const ProfileValidation = {
  userProfileUpdateValidationSchema,
  sendOtpValidationSchema,
  updateEmailOrContactNumberValidationSchema,
};
