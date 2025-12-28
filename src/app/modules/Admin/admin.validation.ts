import { z } from 'zod';
import { USER_STATUS } from '../../constant/user.constant';

// -----------------------------------------------------
// Reusable Schemas
// -----------------------------------------------------
const emailSchema = z
  .string({ required_error: 'Email is required' })
  .email('Invalid email address');

export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
  geoAccuracy: z.number().optional(),
});

// -----------------------------------------------------
// Update Admin Profile Schema
// -----------------------------------------------------
const updateAdminDataValidationSchema = z.object({
  body: z.object({
    // Personal Details
    name: z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
      .optional(),

    contactNumber: z.string().optional(),

    // Address Details
    address: addressSchema.optional(),
  }),
});

// -----------------------------------------------------
// Change Admin Status (Activate / Block)
// -----------------------------------------------------
const activateOrBlockUserValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(USER_STATUS, {
      required_error: 'Status is required',
    }),
  }),
});

// -----------------------------------------------------
// OTP Verification Schema
// -----------------------------------------------------
const verifyOtpValidationSchema = z.object({
  body: z.object({
    email: emailSchema,
    otp: z.string({ required_error: 'OTP is required' }),
  }),
});

// -----------------------------------------------------
// Resend OTP Schema
// -----------------------------------------------------
const resendOtpValidationSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

const adminDocImageValidationSchema = z.object({
  body: z.object({
    docImageTitle: z.enum(['idProofFront', 'idProofBack'], {
      required_error: 'Document title is required',
    }),
  }),
});

// -----------------------------------------------------
// Export Collection
// -----------------------------------------------------
export const AdminValidation = {
  updateAdminDataValidationSchema,
  activateOrBlockUserValidationSchema,
  verifyOtpValidationSchema,
  resendOtpValidationSchema,
  adminDocImageValidationSchema,
};
