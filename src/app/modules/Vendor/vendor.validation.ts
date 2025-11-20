import { z } from 'zod';

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
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        postalCode: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        goAccuracy: z.number().optional(),
      })
      .optional(),

    // Business Details
    businessDetails: z
      .object({
        businessName: z.string().optional(),
        businessType: z.string().optional(),
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
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
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

export const VendorValidation = {
  vendorUpdateValidationSchema,
  vendorDocImageValidationSchema,
};
