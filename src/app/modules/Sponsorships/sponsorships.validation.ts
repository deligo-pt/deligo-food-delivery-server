import { z } from 'zod';

//  Create Sponsorship Validation Schema
const createSponsorshipValidationSchema = z.object({
  body: z
    .object({
      sponsorName: z
        .string({
          required_error: 'Sponsor name is required',
        })
        .min(3, { message: 'Sponsor name must be at least 3 characters long' })
        .trim(),

      sponsorType: z.enum(['Ads', 'Offer', 'Other'], {
        required_error: 'Sponsor type is required',
        invalid_type_error: 'Sponsor type must be Ads, Offer, or Other',
      }),

      startDate: z.coerce.date({
        required_error: 'Start date is required',
        invalid_type_error: 'Invalid start date format',
      }),

      endDate: z.coerce.date({
        required_error: 'End date is required',
        invalid_type_error: 'Invalid end date format',
      }),

      isActive: z.boolean().default(true).optional(),
    })
    .refine((data) => data.endDate > data.startDate, {
      message: 'End date must be later than start date',
      path: ['endDate'],
    }),
});

// Update Sponsorship Validation Schema
const updateSponsorshipValidationSchema = z.object({
  body: z
    .object({
      sponsorName: z.string().min(3).trim().optional(),
      sponsorType: z.enum(['Ads', 'Offer', 'Other']).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      isActive: z.boolean().optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return data.endDate > data.startDate;
        }
        return true;
      },
      {
        message: 'End date must be later than start date',
        path: ['endDate'],
      },
    ),
});

export const SponsorshipValidation = {
  createSponsorshipValidationSchema,
  updateSponsorshipValidationSchema,
};
