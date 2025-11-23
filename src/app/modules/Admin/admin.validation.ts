import { z } from 'zod';
import { USER_STATUS } from '../../constant/user.constant';

// ---------------------------------------------
// Reusable Email Schema
// ---------------------------------------------
const emailSchema = z
  .string({
    required_error: 'Email is required',
  })
  .email('Invalid email address');

// ---------------------------------------------
// Update Admin Data Validation Schema
// ---------------------------------------------
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
        postalCode: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        geoAccuracy: z.number().optional(),
      })
      .optional(),
  }),
});

// ---------------------------------------------
// Activate or Block User
// ---------------------------------------------
export const activateOrBlockUserValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(USER_STATUS, {
      required_error: 'Status is required',
    }),
  }),
});

// ---------------------------------------------
// Verify OTP Validation Schema
// ---------------------------------------------
export const verifyOtpValidationSchema = z.object({
  body: z.object({
    email: emailSchema,
    otp: z.string({
      required_error: 'OTP is required',
    }),
  }),
});

// ---------------------------------------------
// Resend OTP Validation Schema
// ---------------------------------------------
export const resendOtpValidationSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

// ---------------------------------------------
// Final Export
// ---------------------------------------------
export const AdminValidation = {
  updateAdminDataValidationSchema,
  activateOrBlockUserValidationSchema,
  verifyOtpValidationSchema,
  resendOtpValidationSchema,
};
