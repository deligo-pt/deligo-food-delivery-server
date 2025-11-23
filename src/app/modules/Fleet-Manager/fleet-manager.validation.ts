import { z } from 'zod';

// ----------------------------------------------------
// Reusable Address Schema
// ----------------------------------------------------
const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  geoAccuracy: z.number().optional(),
});

// ----------------------------------------------------
// Fleet Manager Update Validation
// ----------------------------------------------------
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
    profilePhoto: z.string().optional(),

    // Address
    address: addressSchema.optional(),

    // Business Details
    businessDetails: z
      .object({
        businessName: z.string().optional(),
        businessLicenseNumber: z.string().optional(),
      })
      .optional(),

    // Business Location
    businessLocation: addressSchema.optional(),

    // Bank & Payment Information
    bankDetails: z
      .object({
        bankName: z.string().optional(),
        accountHolderName: z.string().optional(),
        iban: z.string().optional(),
        swiftCode: z.string().optional(),
      })
      .optional(),

    // Operational Data
    operationalData: z
      .object({
        totalDrivers: z.number().optional(),
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

// ----------------------------------------------------
// Document Upload Validation
// ----------------------------------------------------
export const fleetManagerDocImageValidationSchema = z.object({
  body: z.object({
    docImageTitle: z.enum(['idProof', 'businessLicense'], {
      required_error: 'Document title is required',
    }),
  }),
});

// ----------------------------------------------------
export const FleetManagerValidation = {
  fleetManagerUpdateValidationSchema,
  fleetManagerDocImageValidationSchema,
};
