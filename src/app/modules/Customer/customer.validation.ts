import { z } from 'zod';
import { addressValidationSchema } from '../Admin/admin.validation';

// ---------------------------------------------
// Update Customer Data Validation Schema
// ---------------------------------------------
const updateCustomerDataValidationSchema = z.object({
  body: z
    .object({
      // Personal Details
      name: z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        })
        .strict()
        .optional(),

      profilePhoto: z.string().url().optional(),
      NIF: z.string().optional(),

      // Main Customer Address
      address: addressValidationSchema.optional(),
    })
    .strict(),
});

// ---------------------------------------------
//  add Delivery Address Validation Schema
// ---------------------------------------------
const addDeliveryAddressValidationSchema = z.object({
  body: z
    .object({
      deliveryAddress: addressValidationSchema
        .extend({
          isActive: z.boolean().optional(),

          // zoneId: z.string().optional(),
          addressType: z.enum(['HOME', 'OFFICE', 'OTHER']).optional(),
          notes: z.string().optional(),
        })
        .strict(),
    })
    .strict(),
});

// ---------------------------------------------
// Update Delivery Address Validation Schema
// ---------------------------------------------
const updateDeliveryAddressValidationSchema = z.object({
  body: z
    .object({
      deliveryAddress: addressValidationSchema
        .extend({
          addressType: z.enum(['HOME', 'OFFICE', 'OTHER']).optional(),
          notes: z.string().optional(),
        })
        .strict()
        .partial(),
    })
    .strict(),
});

// ---------------------------------------------
// Export
// ---------------------------------------------
export const CustomerValidation = {
  updateCustomerDataValidationSchema,
  addDeliveryAddressValidationSchema,
  updateDeliveryAddressValidationSchema,
};
