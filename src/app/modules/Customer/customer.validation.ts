import { z } from 'zod';

// Update customer data validation schema
const updateCustomerDataValidationSchema = z.object({
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

    // Delivery Addresses
    deliveryAddresses: z
      .array(
        z.object({
          address: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .optional(),
  }),
});

export const CustomerValidation = {
  updateCustomerDataValidationSchema,
};
