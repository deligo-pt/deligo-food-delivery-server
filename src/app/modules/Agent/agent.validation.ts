import { z } from 'zod';

const agentUpdateValidationSchema = z.object({
  body: z.object({
    //  Company Details
    companyDetails: z
      .object({
        companyName: z.string().optional(),
        companyLicenseNumber: z.string().optional(),
      })
      .optional(),

    // Company Location
    companyLocation: z
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
        idProof: z.string().optional(),
        companyLicense: z.string().optional(),
        profilePhoto: z.string().optional(),
      })
      .optional(),

    // Operation Data
    operationalData: z
      .object({
        noOfDrivers: z.number().optional(),
      })
      .optional(),
  }),
});

const agentDocImageValidationSchema = z.object({
  body: z.object({
    docImageTitle: z
      .enum(['idProof', 'companyLicense', 'profilePhoto'])
      .optional(),
  }),
});

export const AgentValidation = {
  agentUpdateValidationSchema,
  agentDocImageValidationSchema,
};
