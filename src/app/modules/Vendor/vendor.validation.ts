import { z } from 'zod';
import { addressValidationSchema } from '../Admin/admin.validation';

const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

// Valid Weekdays array based on Intl.DateTimeFormat 'long'
const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

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
          restaurantCuisineType: z.array(z.string()).optional(),
          NIF: z.string().optional(),
          totalBranches: z.number().optional(),
          openingHours: z
            .string()
            .regex(timeRegex, {
              message:
                'Opening hours must be in HH:mm 24-hour format (e.g., 09:00)',
            })
            .optional(),

          closingHours: z
            .string()
            .regex(timeRegex, {
              message:
                'Closing hours must be in HH:mm 24-hour format (e.g., 23:00)',
            })
            .optional(),
          closingDays: z
            .array(
              z.enum(weekdays, {
                errorMap: () => ({
                  message:
                    'Invalid day name. Must be full weekday (e.g., Monday)',
                }),
              }),
            )
            .optional(),
        })
        .strict()
        .optional()
        .refine(
          (data) => {
            if (!data) return true;
            if (
              (data.openingHours && !data.closingHours) ||
              (!data.openingHours && data.closingHours)
            ) {
              return false;
            }
            return true;
          },
          {
            message:
              'Both openingHours and closingHours must be provided together',
            path: ['openingHours'],
          },
        )
        .refine(
          (data) => {
            if (!data) return true;
            if (
              data.openingHours &&
              data.closingHours &&
              data.openingHours === data.closingHours
            ) {
              return false;
            }
            return true;
          },
          {
            message:
              'Opening hours and Closing hours cannot be the exact same time',
            path: ['closingHours'],
          },
        ),

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
