import { z } from 'zod';
import { addressSchema } from '../Admin/admin.validation';

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

    profilePhoto: z.string().nullable().optional(),

    address: addressSchema.optional(),
  }),
});

export const ProfileValidation = {
  userProfileUpdateValidationSchema,
};
