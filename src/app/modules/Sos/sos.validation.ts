import { z } from 'zod';

// Validation schema for creating a SOS alert
const createSosValidationSchema = z.object({
  body: z.object({
    orderId: z.string().optional(),
    userNote: z.string().max(200).optional(),
    issueTags: z
      .array(
        z.enum([
          'Accident',
          'Medical Emergency',
          'Fire',
          'Crime',
          'Natural Disaster',
          'Other',
        ])
      )
      .optional(),
    deviceSnapshot: z
      .object({
        batteryLevel: z.number().optional(),
        deviceModel: z.string().optional(),
        osVersion: z.string().optional(),
        appVersion: z.string().optional(),
        networkType: z.string().optional(),
      })
      .optional(),
  }),
});

// Validation schema for updating SOS status
const updateSosStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'INVESTIGATING', 'RESOLVED', 'FALSE_ALARM'], {
      required_error: 'Status is required',
    }),
    note: z
      .string()
      .max(250, 'Admin note cannot exceed 250 characters')
      .optional(),
  }),
});

export const SosValidation = {
  createSosValidationSchema,
  updateSosStatusSchema,
};
