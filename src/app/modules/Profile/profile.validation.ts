import { z } from 'zod';

const sendOtpValidationSchema = z.object({
  body: z
    .object({
      contactNumber: z
        .string({
          invalid_type_error: 'Contact number must be a string.',
        })
        .trim()
        .regex(/^(\+88)?01[3-9]\d{8}$/, {
          message: 'Invalid Bangladeshi mobile number format.',
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
  sendOtpValidationSchema,
  updateEmailOrContactNumberValidationSchema,
};
