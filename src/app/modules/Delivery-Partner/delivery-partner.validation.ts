import { z } from 'zod';
import { addressValidationSchema } from '../Admin/admin.validation';

// ---------------------------------------------
// Update Delivery Partner Data Validation Schema
// ---------------------------------------------
const updateDeliveryPartnerDataValidationSchema = z.object({
  body: z
    .object({
      name: z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        })
        .strict()
        .optional(),
      contactNumber: z.string().optional(),
      address: addressValidationSchema.optional(),

      // Personal Information
      personalInfo: z
        .object({
          dateOfBirth: z.string().optional(),
          gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
          nationality: z.string().optional(),

          NIF: z.string().optional(),
          passportNumber: z.string().optional(),
        })
        .strict()
        .optional(),

      //  Right to Work / Legal Status
      legalStatus: z
        .object({
          residencePermitType: z.string().optional(),
          residencePermitNumber: z.string().optional(),
          residencePermitExpiry: z.string().optional(),
        })
        .strict()
        .optional(),

      // Banking Details
      bankDetails: z
        .object({
          bankName: z.string().optional(),
          accountHolderName: z.string().optional(),
          accountNumber: z.string().optional(),
          iban: z.string().optional(),
          swiftCode: z.string().optional(),
        })
        .strict()
        .optional(),

      // Vehicle Information
      vehicleInfo: z
        .object({
          vehicleType: z
            .enum(['BICYCLE', 'E-BIKE', 'SCOOTER', 'MOTORBIKE', 'CAR'])
            .optional(),
          brand: z.string().optional(),
          model: z.string().optional(),
          licensePlate: z.string().optional(),
          drivingLicenseNumber: z.string().optional(),
          drivingLicenseExpiry: z.string().optional(),
          insurancePolicyNumber: z.string().optional(),
          insuranceExpiry: z.string().optional(),
        })
        .strict()
        .optional(),

      // Criminal Background
      criminalRecord: z
        .object({
          certificate: z.boolean().optional(),
          issueDate: z.string().optional(),
          expiryDate: z.string().optional(),
        })
        .strict()
        .optional(),

      // Work Preferences & Equipment
      workPreferences: z
        .object({
          preferredZones: z.array(z.string()).optional(),
          preferredHours: z.array(z.string()).optional(),

          hasEquipment: z
            .object({
              isothermalBag: z.boolean().optional(),
              helmet: z.boolean().optional(),
              powerBank: z.boolean().optional(),
            })
            .strict()
            .optional(),

          workedWithOtherPlatform: z.boolean().optional(),
          otherPlatformName: z.string().optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
});

// ---------------------------------------------
// Document Upload Validation Schema
// ---------------------------------------------
const deliveryPartnerDocImageValidationSchema = z.object({
  body: z
    .object({
      docImageTitle: z.enum([
        'myPhoto',
        'idProofFront',
        'idProofBack',
        'drivingLicenseFront',
        'drivingLicenseBack',
        'vehicleRegistration',
        'criminalRecordCertificate',
        'activity',
        'insurancePolicy',
      ]),
    })
    .strict(),
});

const deliveryPartnerStatusChangeValidationSchema = z.object({
  body: z
    .object({
      status: z.enum(['IDLE', 'OFFLINE']),
    })
    .strict(),
});

// ---------------------------------------------
export const DeliveryPartnerValidation = {
  updateDeliveryPartnerDataValidationSchema,
  deliveryPartnerDocImageValidationSchema,
  deliveryPartnerStatusChangeValidationSchema,
};
