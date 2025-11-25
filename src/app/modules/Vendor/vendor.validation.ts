import { z } from 'zod';
import { addressSchema } from '../Admin/admin.validation';

// --------------------------------------------------
// Vendor Update Validation Schema
// --------------------------------------------------
export const vendorUpdateValidationSchema = z.object({
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
  }),
});

// --------------------------------------------------
// Document Image Validation
// --------------------------------------------------
export const vendorDocImageValidationSchema = z.object({
  body: z.object({
    docImageTitle: z.enum(
      ['businessLicenseDoc', 'taxDoc', 'idProof', 'storePhoto', 'menuUpload'],
      { required_error: 'Document title is required' }
    ),
  }),
});

// --------------------------------------------------
export const VendorValidation = {
  vendorUpdateValidationSchema,
  vendorDocImageValidationSchema,
};
