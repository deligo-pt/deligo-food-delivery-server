import { z } from 'zod';
import { USER_ROLE, USER_STATUS } from '../../constant/user.const';

// Update customer data validation schema
const updateCustomerDataValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    contactNumber: z.string().optional(),
    profilePhoto: z.string().optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        zipcode: z.string().optional(),
      })
      .optional(),
  }),
});

const updateCustomerValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    role: z.nativeEnum(USER_ROLE).optional(),
    email: z.string().email().optional(),
    password: z.string().optional(),
    status: z.nativeEnum(USER_STATUS).optional(),
    contactNumber: z.string().optional(),
  }),
});

export const CustomerValidation = {
  updateCustomerDataValidationSchema,
  updateCustomerValidationSchema,
};
