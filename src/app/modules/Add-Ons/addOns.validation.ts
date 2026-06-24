import z from 'zod';
import { createLocalizedValidationSchema } from '../../constant/GlobalValidation/language.validation';

const createOptionSchema = z.object({
  name: createLocalizedValidationSchema('option name'),
  price: z.number().min(0, 'Price cannot be negative'),
  tax: z.string({ required_error: 'Tax ID is required for each option' }),
  isActive: z.boolean().optional().default(true),
});

const updateOptionSchema = z.object({
  name: createLocalizedValidationSchema('option name', true).optional(),
  price: z.number().min(0, 'Price cannot be negative').optional(),
  tax: z
    .string({ required_error: 'Tax ID is required for each option' })
    .optional(),
  isActive: z.boolean().optional(),
});

// --- CREATE SCHEMA ---
const createAddonGroupValidationSchema = z.object({
  body: z
    .object({
      title: createLocalizedValidationSchema('addon group title'),
      minSelectable: z
        .number()
        .min(0, 'Minimum selection cannot be negative')
        .default(0),
      maxSelectable: z.number().min(1, 'Maximum selection must be at least 1'),
      options: z
        .array(createOptionSchema)
        .min(1, 'At least one option must be provided in the group'),
      isActive: z.boolean().optional().default(true),
    })
    .strict()
    .refine((data) => (data.minSelectable ?? 0) <= data.maxSelectable, {
      message: 'Min selectable cannot be greater than max selectable',
      path: ['minSelectable'],
    })
    .refine((data) => data.maxSelectable <= data.options.length, {
      message: 'Max selectable cannot exceed the number of available options',
      path: ['maxSelectable'],
    }),
});

// --- UPDATE SCHEMA ---
const updateAddonGroupValidationSchema = z.object({
  body: z
    .object({
      title: createLocalizedValidationSchema(
        'addon group title',
        true,
      ).optional(),
      minSelectable: z.number().min(0).optional(),
      maxSelectable: z.number().min(1).optional(),
      options: z.array(updateOptionSchema).min(1).optional(),
      isActive: z.boolean().optional(),
    })
    .strict()
    .refine(
      (data) => {
        if (
          data.minSelectable !== undefined &&
          data.maxSelectable !== undefined
        ) {
          return data.minSelectable <= data.maxSelectable;
        }
        return true;
      },
      {
        message: 'Min selectable cannot be greater than max selectable',
        path: ['minSelectable'],
      },
    )
    .refine(
      (data) => {
        if (data.maxSelectable !== undefined && data.options !== undefined) {
          return data.maxSelectable <= data.options.length;
        }
        return true;
      },
      {
        message: 'Max selectable cannot exceed the number of available options',
        path: ['maxSelectable'],
      },
    ),
});

const addOptionToAddonGroupValidationSchema = z.object({
  body: z
    .object({
      name: createLocalizedValidationSchema('option name'),
      price: z
        .number({ required_error: 'Price is required' })
        .min(0, 'Price cannot be negative'),
      tax: z.string({ required_error: 'Tax ID is required for the option' }),
    })
    .strict(),
});
const toggleOptionStatusValidationSchema = z.object({
  body: z
    .object({
      optionSku: z.string({ required_error: 'Option SKU is required' }),
    })
    .strict(),
});

export const AddOnsValidation = {
  createAddonGroupValidationSchema,
  updateAddonGroupValidationSchema,
  addOptionToAddonGroupValidationSchema,
  toggleOptionStatusValidationSchema,
};
