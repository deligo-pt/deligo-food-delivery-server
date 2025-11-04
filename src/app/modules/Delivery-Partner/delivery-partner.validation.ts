import { z } from 'zod';

// Update delivery partner  data validation schema
const updateDeliveryPartnerDataValidationSchema = z.object({
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

export const DeliveryPartnerValidation = {
  updateDeliveryPartnerDataValidationSchema,
};
