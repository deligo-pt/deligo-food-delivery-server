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

const updateCustomerLiveLocationValidationSchema = z.object({
  body: z
    .object({
      latitude: z
        .number({ required_error: 'Latitude is required' })
        .min(-90, { message: 'Latitude must be between -90 and 90' })
        .max(90, { message: 'Latitude must be between -90 and 90' }),
      longitude: z
        .number({ required_error: 'Longitude is required' })
        .min(-180, { message: 'Longitude must be between -180 and 180' })
        .max(180, { message: 'Longitude must be between -180 and 180' }),

      geoAccuracy: z.number().nonnegative().optional(),
      isMocked: z.boolean().optional(),

      street: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      country: z.string().trim().optional(),
      postalCode: z.string().trim().optional(),
      detailedAddress: z.string().trim().optional(),
      notes: z.string().trim().optional(),
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
  updateCustomerLiveLocationValidationSchema,
};
