import z from 'zod';

const createAddonGroupValidationSchema = z.object({
  body: z.object({
    title: z.string({
      required_error: 'Group title is required (e.g., Extra Cheese)',
    }),
    minSelectable: z
      .number()
      .min(0, 'Minimum selection cannot be negative')
      .default(0),
    maxSelectable: z.number().min(1, 'Maximum selection must be at least 1'),
    options: z
      .array(
        z.object({
          name: z.string({ required_error: 'Option name is required' }),
          price: z.number().min(0, 'Price cannot be negative'),
          isActive: z.boolean().optional().default(true),
        })
      )
      .min(1, 'At least one option must be provided in the group'),
    isActive: z.boolean().optional().default(true),
  }),
});

const updateAddonGroupValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    minSelectable: z.number().min(0).optional(),
    maxSelectable: z.number().min(1).optional(),
    options: z
      .array(
        z.object({
          name: z.string().optional(),
          price: z.number().min(0).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .optional(),
  }),
});

export const AddOnsValidation = {
  createAddonGroupValidationSchema,
  updateAddonGroupValidationSchema,
};
