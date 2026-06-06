import { z } from 'zod';
import { addressValidationSchema } from '../Admin/admin.validation';

// ----------------------------------------------------
// Fleet Manager Update Validation
// ----------------------------------------------------
const fleetManagerUpdateValidationSchema = z.object({
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

      contactNumber: z.string().optional(),

      // Address
      address: addressValidationSchema.optional(),

      // Business Details
      businessDetails: z
        .object({
          businessName: z.string().optional(),
          businessLicenseNumber: z.string().optional(),
          NIF: z.string().optional(),
          totalBranches: z.number().optional(),
        })
        .strict()
        .optional(),

      // Business Location
      businessLocation: addressValidationSchema.optional(),

      // Bank & Payment Information
      bankDetails: z
        .object({
          bankName: z.string().optional(),
          accountHolderName: z.string().optional(),
          iban: z.string().optional(),
          swiftCode: z.string().optional(),
        })
        .strict()
        .optional(),

      // Operational Data
      operationalData: z
        .object({
          totalDrivers: z.number().min(0).optional(),
          activeVehicles: z.number().min(0).optional(),
          totalDeliveries: z.number().optional(),

          rating: z
            .object({
              average: z.number().min(0).max(5).optional(),
              totalReviews: z.number().optional(),
            })
            .strict()
            .optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
});

// ----------------------------------------------------
// Document Upload Validation
// ----------------------------------------------------
const fleetManagerDocImageValidationSchema = z.object({
  body: z
    .object({
      docImageTitle: z.enum(
        [
          'myPhoto',
          'idProofFront',
          'idProofBack',
          'businessLicense',
          'proofOfAddress',
          'activityDocument',
        ],
        {
          required_error: 'Document title is required',
        },
      ),
      docImageUrls: z
        .array(
          z
            .string()
            .url({ message: 'Each document image URL must be a valid URL' }),
        )
        .min(1, 'At least one document image URL is required'),
    })
    .strict(),
});

// --------------------------------------------------
// Fleet Manager Document Delete Validation Schema
// --------------------------------------------------
const fleetManagerDocImageDeleteValidationSchema = z.object({
  body: z
    .object({
      docImageTitle: z.enum(
        [
          'myPhoto',
          'idProofFront',
          'idProofBack',
          'businessLicense',
          'proofOfAddress',
          'activityDocument',
        ],
        {
          required_error: 'Document image title is required',
        },
      ),
      imageUrl: z.string({}).url({ message: 'Valid image URL is required' }),
    })
    .strict(),
});

// ----------------------------------------------------
export const FleetManagerValidation = {
  fleetManagerUpdateValidationSchema,
  fleetManagerDocImageValidationSchema,
  fleetManagerDocImageDeleteValidationSchema,
};
