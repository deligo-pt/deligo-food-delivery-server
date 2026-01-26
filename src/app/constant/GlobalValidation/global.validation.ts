import { z } from 'zod';
const UpdateLiveLocationValidationSchema = z.object({
  body: z.object({
    latitude: z
      .number({ required_error: 'Latitude is required' })
      .min(-90)
      .max(90),
    longitude: z
      .number({ required_error: 'Longitude is required' })
      .min(-180)
      .max(180),
    geoAccuracy: z.number().optional(),
    heading: z.number().min(0).max(360).optional(),
    speed: z.number().min(0).optional(),
    isMocked: z.boolean().optional(),
    timestamp: z.string().datetime().optional(),
  }),
});

export const GlobalValidation = {
  UpdateLiveLocationValidationSchema,
};
