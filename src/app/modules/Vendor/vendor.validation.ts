import { z } from 'zod';
import { addressValidationSchema } from '../Admin/admin.validation';

// --------------------------------------------------
// Vendor Update Validation Schema
// --------------------------------------------------
const vendorUpdateValidationSchema = z.object({
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
    address: addressValidationSchema.optional(),

    // Business Details
    businessDetails: z
      .object({
        businessName: z.string().optional(),
        businessType: z.string().optional(),
        businessLicenseNumber: z.string().optional(),
        NIF: z.string().optional(),
        totalBranches: z.number().optional(),
        openingHours: z.string().optional(),
        closingHours: z.string().optional(),
        closingDays: z.array(z.string()).optional(),
      })
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
      .optional(),
  }),
});

// --------------------------------------------------
// Document Image Validation
// --------------------------------------------------
const vendorDocImageValidationSchema = z.object({
  body: z.object({
    docImageTitle: z.enum(
      [
        'businessLicenseDoc',
        'taxDoc',
        'idProofFront',
        'idProofBack',
        'storePhoto',
        'menuUpload',
      ],
      { required_error: 'Document title is required' },
    ),
  }),
});

// --------------------------------------------------
// Vendor business location update validation schema
// --------------------------------------------------
const vendorBusinessLocationUpdateValidationSchema = z.object({
  body: z.object({
    businessLocation: z.object({
      street: z.string({ required_error: 'Street is required' }).min(1),
      city: z.string({ required_error: 'City is required' }).min(1),
      state: z.string({ required_error: 'State is required' }).min(1),
      country: z.string({ required_error: 'Country is required' }).min(1),
      postalCode: z
        .string({ required_error: 'Postal code is required' })
        .min(1),
      longitude: z.number({ required_error: 'Longitude is required' }).min(1),
      latitude: z.number({ required_error: 'Latitude is required' }).min(1),
      geoAccuracy: z.number().optional(),
    }),
  }),
});

// --------------------------------------------------
export const VendorValidation = {
  vendorUpdateValidationSchema,
  vendorDocImageValidationSchema,
  vendorBusinessLocationUpdateValidationSchema,
};
