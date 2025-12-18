import { z } from 'zod';

const geoJsonCoordinatesSchema = z.array(
  z.array(
    z
      .array(z.number())
      .length(2, 'Coordinates must be a [longitude, latitude] pair')
  )
);

// Zod schema for the entire TZone type
const createZoneSchema = z.object({
  body: z.object({
    zoneId: z.string().min(3, 'Zone ID is required and must be unique.'),
    district: z.string().min(1, 'District is required (e.g., Lisbon).'),
    zoneName: z.string().min(1, 'Zone name is required (e.g., Lisbon Centre).'),

    boundary: z.object({
      type: z.literal('Polygon'),
      coordinates: geoJsonCoordinatesSchema,
    }),

    isOperational: z.boolean().optional(),
    minDeliveryFee: z.number().positive().optional(),
    maxDeliveryDistanceKm: z.number().positive().optional(),
  }),
});

// Zod schema for checking a point within a zone
const checkPointInZoneSchema = z.object({
  body: z.object({
    lng: z
      .string({ required_error: 'Longitude (lng) is required' })
      .refine((val) => !isNaN(parseFloat(val)), {
        message: 'Must be a number',
      }),
    lat: z
      .string({ required_error: 'Latitude (lat) is required' })
      .refine((val) => !isNaN(parseFloat(val)), {
        message: 'Must be a number',
      }),
  }),
});

// Zod schema for updating a zone
const updateZoneSchema = z.object({
  body: z.object({
    zoneName: z
      .string()
      .min(1, 'Zone name is required (e.g., Lisbon Centre).')
      .optional(),
    district: z
      .string()
      .min(1, 'District is required (e.g., Lisbon).')
      .optional(),

    minDeliveryFee: z.number().positive().optional(),
    maxDeliveryDistanceKm: z.number().positive().optional(),
    isOperational: z.boolean().optional(),

    boundary: z
      .object({
        type: z.literal('Polygon'),
        coordinates: geoJsonCoordinatesSchema,
      })
      .optional(),
  }),
});

// Zod schema for toggling zone status
const toggleZoneStatusSchema = z.object({
  body: z.object({
    isOperational: z.boolean({
      required_error: 'isOperational field is required',
    }),
  }),
});

export const ZoneValidation = {
  createZoneSchema,
  checkPointInZoneSchema,
  updateZoneSchema,
  toggleZoneStatusSchema,
};
