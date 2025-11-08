import { z } from 'zod';

// Update delivery partner  data validation schema

export const updateDeliveryPartnerDataValidationSchema = z.object({
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

    // Operational Data
    operationalData: z
      .object({
        vehicleType: z
          .enum(['BIKE', 'CAR', 'SCOOTER', 'BICYCLE', 'OTHER'])
          .optional(),
        licenseNumber: z.string().optional(),
      })
      .optional(),

    // Bank Details
    bankDetails: z
      .object({
        bankName: z.string().optional(),
        accountHolderName: z.string().optional(),
        iban: z.string().optional(),
        swiftCode: z.string().optional(),
      })
      .optional(),
  }),
});

export const DeliveryPartnerValidation = {
  updateDeliveryPartnerDataValidationSchema,
};
