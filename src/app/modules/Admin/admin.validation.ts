import { z } from 'zod';
import { USER_STATUS } from '../../constant/user.const';

// Update admin data validation schema

export const updateAdminDataValidationSchema = z.object({
  body: z.object({
    // Personal Details
    name: z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
      .optional(),
    contactNumber: z.string().optional(),
    profilePhoto: z.string().optional(),

    // Address
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        zipCode: z.string().optional(),
      })
      .optional(),
  }),
});

// Activate or Block User Validation Schema
const activateOrBlockUserValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(USER_STATUS),
  }),
});

// Verify OTP Validation Schema
const verifyOtpValidationSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'Email is required',
    }),
    otp: z.string({
      required_error: 'OTP is required',
    }),
  }),
});

// Resend OTP Validation Schema
const resendOtpValidationSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'Email is required',
    }),
  }),
});

export const AdminValidation = {
  updateAdminDataValidationSchema,
  activateOrBlockUserValidationSchema,
  verifyOtpValidationSchema,
  resendOtpValidationSchema,
};
