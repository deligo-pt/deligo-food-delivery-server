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

    // admin only
    isUpdateLocked: z.boolean().optional(),
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
// Get All Vendors for Customer Validation Schema
// --------------------------------------------------
const getAllVendorsForCustomerValidationSchema = z.object({
  body: z.object({
    coordinates: z
      .array(z.number(), {
        required_error: 'Coordinates are required',
        invalid_type_error: 'Coordinates must be an array of numbers',
      })
      .length(2, { message: 'Coordinates must have exactly 2 numbers' }),
  }),
});

// --------------------------------------------------
export const VendorValidation = {
  vendorUpdateValidationSchema,
  vendorDocImageValidationSchema,
  getAllVendorsForCustomerValidationSchema,
};
