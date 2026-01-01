import { z } from 'zod';
import { addressValidationSchema } from '../Admin/admin.validation';

// ---------------------------------------------
// User Profile Update Validation
// ---------------------------------------------
const userProfileUpdateValidationSchema = z.object({
  body: z.object({
    name: z
      .object({
        firstName: z.string({
          required_error: 'First name is required',
        }),
        lastName: z.string({
          required_error: 'Last name is required',
        }),
      })
      .optional(),

    contactNumber: z
      .string({
        required_error: 'Contact number is required',
      })
      .optional(),
    NIF: z.string().optional().nullable(),

    profilePhoto: z.string().nullable().optional(),

    address: addressValidationSchema.optional(),
  }),
});

// ---------------------------------------------
// Update Contact Number Validation
// ---------------------------------------------
const updateContactNumberValidationSchema = z.object({
  body: z.object({
    contactNumber: z
      .string({
        required_error: 'Contact number is required',
      })
      .optional(),
    email: z.string({ required_error: 'Email is required' }).optional(),
  }),
});

export const ProfileValidation = {
  userProfileUpdateValidationSchema,
  updateContactNumberValidationSchema,
};
