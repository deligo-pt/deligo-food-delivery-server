import { z } from 'zod';
import { addressValidationSchema } from '../Admin/admin.validation';

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
    address: addressValidationSchema.optional(),
    NIF: z.string().optional(),

    // Delivery Addresses (multiple saved addresses)
    deliveryAddresses: z
      .array(
        addressValidationSchema.extend({
          isActive: z.boolean().optional(),
        }),
      )
      .optional(),
  }),
});

// ---------------------------------------------
//  add Delivery Address Validation Schema
// ---------------------------------------------
const addDeliveryAddressValidationSchema = z.object({
  body: z.object({
    deliveryAddress: addressValidationSchema.extend({
      isActive: z.boolean().optional(),

      // zoneId: z.string().optional(),
      addressType: z.enum(['HOME', 'OFFICE', 'OTHER']).optional(),
      notes: z.string().optional(),
    }),
  }),
});

// ---------------------------------------------
// Export
// ---------------------------------------------
export const CustomerValidation = {
  updateCustomerDataValidationSchema,
  addDeliveryAddressValidationSchema,
};
