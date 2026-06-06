import { z } from 'zod';
import { addressValidationSchema } from '../Admin/admin.validation';
import { CuisineType } from './vendor.constant';

// --------------------------------------------------
// Vendor Update Validation Schema
// --------------------------------------------------
const vendorUpdateValidationSchema = z.object({
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
          businessType: z.string().optional(),
          restaurantCuisineType: z
            .enum(Object.values(CuisineType) as [string, ...string[]])
            .optional(),
          businessLicenseNumber: z.string().optional(),
          NIF: z.string().optional(),
          totalBranches: z.number().optional(),
          openingHours: z.string().optional(),
          closingHours: z.string().optional(),
          closingDays: z.array(z.string()).optional(),
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

      // admin only
      isUpdateLocked: z.boolean().optional(),
    })
    .strict(),
});

// --------------------------------------------------
// Document Image Validation
// --------------------------------------------------
const vendorDocImageValidationSchema = z.object({
  body: z
    .object({
      docImageTitle: z.enum(
        [
          'myPhoto',
          'businessLicenseDoc',
          'taxDoc',
          'idProofFront',
          'idProofBack',
          'storePhoto',
          'menuUpload',
          'agoserisHaccpCertificate',
        ],
        { required_error: 'Document title is required' },
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
// Vendor Document Delete Validation Schema
// --------------------------------------------------
const vendorDocImageDeleteValidationSchema = z.object({
  body: z
    .object({
      docImageTitle: z.enum(
        [
          'myPhoto',
          'businessLicenseDoc',
          'taxDoc',
          'idProofFront',
          'idProofBack',
          'storePhoto',
          'menuUpload',
          'agoserisHaccpCertificate',
        ],
        { required_error: 'Document title is required' },
      ),
      imageUrl: z.string().url({ message: 'Valid image URL is required' }),
    })
    .strict(),
});

// --------------------------------------------------
export const VendorValidation = {
  vendorUpdateValidationSchema,
  vendorDocImageValidationSchema,
  vendorDocImageDeleteValidationSchema,
};
