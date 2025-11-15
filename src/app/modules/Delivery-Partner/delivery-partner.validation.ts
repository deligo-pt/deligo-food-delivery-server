import { z } from 'zod';

// Update delivery partner  data validation schema

const updateDeliveryPartnerDataValidationSchema = z.object({
  body: z.object({
    // 1) Personal Information

    personalInfo: z
      .object({
        Name: z
          .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
          })
          .optional(),

        dateOfBirth: z.string().datetime().optional(),
        gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
        nationality: z.string().optional(),

        nifNumber: z.string().optional(),
        citizenCardNumber: z.string().optional(),
        passportNumber: z.string().optional(),

        idExpiryDate: z.string().datetime().optional(),

        idDocumentFront: z.string().optional(),
        idDocumentBack: z.string().optional(),

        address: z
          .object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
            zipCode: z.string().optional(),
          })
          .optional(),
        contactNumber: z.string().optional(),
      })
      .optional(),

    // 2) Right to Work / Legal Status

    legalStatus: z
      .object({
        residencePermitType: z.string().optional(),
        residencePermitNumber: z.string().optional(),
        residencePermitExpiry: z.string().datetime().optional(),
      })
      .optional(),

    // 3) Payment & Banking Details

    bankDetails: z
      .object({
        bankName: z.string().optional(),
        accountHolderName: z.string().optional(),
        iban: z.string().optional(),
        swiftCode: z.string().optional(),
      })
      .optional(),

    // 4) Vehicle Information
    vehicleInfo: z
      .object({
        vehicleType: z
          .enum(['BICYCLE', 'E-BIKE', 'SCOOTER', 'MOTORBIKE', 'CAR'])
          .optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
        licensePlate: z.string().optional(),
        drivingLicenseNumber: z.string().optional(),
        drivingLicenseExpiry: z.string().datetime().optional(),
        insurancePolicyNumber: z.string().optional(),
        insuranceExpiry: z.string().datetime().optional(),
      })
      .optional(),

    // 5) Criminal Background
    criminalRecord: z
      .object({
        certificateURL: z.string().optional(),
        issueDate: z.string().datetime().optional(),
      })
      .optional(),

    // 6) Work Preferences / Equipment
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
          .optional(),
        workedWithOtherPlatform: z.boolean().optional(),
        otherPlatformName: z.string().optional(),
      })
      .optional(),

    // Existing Operational Data
    operationalData: z
      .object({
        totalDeliveries: z.number().optional(),
        completedDeliveries: z.number().optional(),
        canceledDeliveries: z.number().optional(),
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

// doc image update validation schema
const deliveryPartnerDocImageValidationSchema = z.object({
  body: z.object({
    docImageTitle: z
      .enum([
        'idProof',
        'drivingLicense',
        'residencePermit',
        'criminalRecordCertificate',
      ])
      .optional(),
  }),
});

export const DeliveryPartnerValidation = {
  updateDeliveryPartnerDataValidationSchema,
  deliveryPartnerDocImageValidationSchema,
};
