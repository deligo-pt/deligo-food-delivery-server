import { z } from 'zod';

// ---------------------------------------------
// Reusable Address Schema
// ---------------------------------------------
const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  geoAccuracy: z.number().optional(),
});

// ---------------------------------------------
// Update Delivery Partner Data Validation Schema
// ---------------------------------------------
const updateDeliveryPartnerDataValidationSchema = z.object({
  body: z.object({
    profilePhoto: z.string().optional(),

    // 1️⃣ Personal Information
    personalInfo: z
      .object({
        name: z
          .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
          })
          .optional(),

        dateOfBirth: z.string().optional(),
        gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
        nationality: z.string().optional(),

        nifNumber: z.string().optional(),
        citizenCardNumber: z.string().optional(),
        passportNumber: z.string().optional(),

        idExpiryDate: z.string().optional(),

        address: addressSchema.optional(),
        contactNumber: z.string().optional(),
      })
      .optional(),

    // 2️⃣ Right to Work / Legal Status
    legalStatus: z
      .object({
        residencePermitType: z.string().optional(),
        residencePermitNumber: z.string().optional(),
        residencePermitExpiry: z.string().optional(),
      })
      .optional(),

    // 3️⃣ Banking Details
    bankDetails: z
      .object({
        bankName: z.string().optional(),
        accountHolderName: z.string().optional(),
        iban: z.string().optional(),
        swiftCode: z.string().optional(),
      })
      .optional(),

    // 4️⃣ Vehicle Information
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
      .optional(),

    // 5️⃣ Criminal Background
    criminalRecord: z
      .object({
        certificate: z.boolean().optional(),
        issueDate: z.string().optional(),
      })
      .optional(),

    // 6️⃣ Work Preferences & Equipment
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
  }),
});

// ---------------------------------------------
// Document Upload Validation Schema
// ---------------------------------------------
const deliveryPartnerDocImageValidationSchema = z.object({
  body: z.object({
    docImageTitle: z.enum([
      'idDocumentFront',
      'idDocumentBack',
      'drivingLicense',
      'vehicleRegistration',
      'criminalRecordCertificate',
    ]),
  }),
});

// ---------------------------------------------
export const DeliveryPartnerValidation = {
  updateDeliveryPartnerDataValidationSchema,
  deliveryPartnerDocImageValidationSchema,
};
