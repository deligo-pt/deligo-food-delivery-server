import { z } from 'zod';
import { addressSchema } from '../Admin/admin.validation';

// ---------------------------------------------
// Update Customer Data Validation Schema
// ---------------------------------------------
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

    // Main Customer Address
    address: addressSchema.optional(),

    // Delivery Addresses (multiple saved addresses)
    deliveryAddresses: z
      .array(
        addressSchema.extend({
          isActive: z.boolean().optional(),
        })
      )
      .optional(),
  }),
});

// ---------------------------------------------
// Export
// ---------------------------------------------
export const CustomerValidation = {
  updateCustomerDataValidationSchema,
};
