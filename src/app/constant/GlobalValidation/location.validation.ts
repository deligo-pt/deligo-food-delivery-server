import { z } from 'zod';
const UpdateLiveLocationValidationSchema = z.object({
  body: z.object({
    latitude: z
      .number({ required_error: 'Latitude is required' })
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
    longitude: z
      .number({ required_error: 'Longitude is required' })
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
    geoAccuracy: z.number().optional(),
    heading: z
      .number()
      .min(0, 'Heading must be between 0 and 360')
      .max(360, 'Heading must be between 0 and 360')
      .optional(),
    speed: z.number().min(0, 'Speed must be a non-negative number').optional(),
    isMocked: z.boolean().optional(),
    timestamp: z
      .string()
      .datetime('Timestamp must be a valid ISO datetime string')
      .optional(),
  }).strict(),
}).strict();

export const LocationValidation = {
  UpdateLiveLocationValidationSchema,
};
