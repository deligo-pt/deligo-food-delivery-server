import { z } from 'zod';
import { BusinessTypes } from './vendor.constant';
//
const vendorUpdateValidationSchema = z.object({
  body: z.object({
    //  Business Details
    businessDetails: z
      .object({
        businessName: z.string().optional(),
        businessType: z.enum(BusinessTypes).optional(),
        businessLicenseNumber: z.string().optional(),
        NIF: z.string().optional(),
        noOfBranch: z.number().optional(),
        openingHours: z.string().optional(),
        closingHours: z.string().optional(),
        closingDays: z.array(z.string()).optional(),
      })
      .optional(),

    // Business Location
    businessLocation: z
      .object({
        streetAddress: z.string().optional(),
        streetNumber: z.string().optional(),
        city: z.string().optional(),
        postalCode: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
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
    // Documents & Verification
    documents: z
      .object({
        businessLicenseDoc: z.string().optional(),
        taxDoc: z.string().optional(),
        idProof: z.string().optional(),
        storePhoto: z.string().optional(),
        menuUpload: z.string().optional(),
      })
      .optional(),
  }),
});

const vendorDocImageValidationSchema = z.object({
  body: z.object({
    docImageTitle: z
      .enum([
        'businessLicenseDoc',
        'taxDoc',
        'idProof',
        'storePhoto',
        'menuUpload',
      ])
      .optional(),
  }),
});

const approveOrRejectVendorValidationSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
  }),
});

export const VendorValidation = {
  vendorUpdateValidationSchema,
  vendorDocImageValidationSchema,
  approveOrRejectVendorValidationSchema,
};
