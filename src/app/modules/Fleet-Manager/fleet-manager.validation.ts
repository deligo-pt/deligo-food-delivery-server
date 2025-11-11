import { z } from 'zod';

export const fleetManagerUpdateValidationSchema = z.object({
  body: z.object({
    // Personal Details
    name: z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
      .optional(),
    contactNumber: z.string().optional(),

    // Address
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),

    // Company Details
    companyDetails: z
      .object({
        companyName: z.string().optional(),
        companyLicenseNumber: z.string().optional(),
      })
      .optional(),

    // Company Location
    companyLocation: z
      .object({
        streetAddress: z.string().optional(),
        streetNumber: z.string().optional(),
        city: z.string().optional(),
        postalCode: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        geoAccuracy: z.number().optional(),
      })
      .optional(),

    // Bank & Payment Information
    bankDetails: z
      .object({
        bankName: z.string().optional(),
        accountHolderName: z.string().optional(),
        iban: z.string().optional(),
        swiftCode: z.string().optional(),
      })
      .optional(),

    // Operation Data
    operationalData: z
      .object({
        noOfDrivers: z.number().optional(),
        activeVehicles: z.number().optional(),
        totalDeliveries: z.number().optional(),
        rating: z
          .object({
            average: z.number().optional(),
            totalReviews: z.number().optional(),
          })
          .optional(),
      })
      .optional(),
  }),
});

const fleetManagerDocImageValidationSchema = z.object({
  body: z.object({
    docImageTitle: z.enum(['idProof', 'companyLicense']).optional(),
  }),
});

export const FleetManagerValidation = {
  fleetManagerUpdateValidationSchema,
  fleetManagerDocImageValidationSchema,
};
