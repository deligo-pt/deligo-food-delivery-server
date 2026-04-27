import { z } from 'zod';
import { addressValidationSchema } from '../Admin/admin.validation';

// ---------------------------------------------
// Update Customer Data Validation Schema
// ---------------------------------------------
const updateCustomerDataValidationSchema = z.object({
  body: z.object({
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
// Update Delivery Address Validation Schema
// ---------------------------------------------
const updateDeliveryAddressValidationSchema = z.object({
  body: z.object({
    deliveryAddress: addressValidationSchema
      .extend({
        addressType: z.enum(['HOME', 'OFFICE', 'OTHER']).optional(),
        notes: z.string().optional(),
      })
      .partial(),
  }),
});

// ---------------------------------------------
// Export
// ---------------------------------------------
export const CustomerValidation = {
  updateCustomerDataValidationSchema,
  addDeliveryAddressValidationSchema,
  updateDeliveryAddressValidationSchema,
};
