import z from 'zod';

const optionSchema = z.object({
  name: z.string({ required_error: 'Option name is required' }),
  price: z.number().min(0, 'Price cannot be negative'),
  tax: z.string({ required_error: 'Tax ID is required for each option' }),
  isActive: z.boolean().optional().default(true),
});

const updateOptionSchema = z.object({
  sku: z.string({
    required_error: 'Option SKU is strictly required to update an option',
  }),
  name: z.string().optional(),
  price: z.number().min(0).optional(),
  tax: z.string().optional(),
  isActive: z.boolean().optional(),
});

// --- CREATE SCHEMA ---
const createAddonGroupValidationSchema = z.object({
  body: z
    .object({
      title: z.string({
        required_error: 'Group title is required (e.g., Extra Cheese)',
      }),
      minSelectable: z
        .number()
        .min(0, 'Minimum selection cannot be negative')
        .default(0),
      maxSelectable: z.number().min(1, 'Maximum selection must be at least 1'),
      options: z
        .array(optionSchema)
        .min(1, 'At least one option must be provided in the group'),
      isActive: z.boolean().optional().default(true),
    })
    .strict()
    .refine((data) => (data.minSelectable ?? 0) <= data.maxSelectable, {
      message: 'minSelectable cannot be greater than maxSelectable',
      path: ['minSelectable'],
    })
    .refine((data) => data.maxSelectable <= data.options.length, {
      message: 'maxSelectable cannot exceed the number of available options',
      path: ['maxSelectable'],
    }),
});

// --- UPDATE SCHEMA ---
const updateAddonGroupValidationSchema = z.object({
  body: z
    .object({
      title: z.string().optional(),
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
        message: 'minSelectable cannot be greater than maxSelectable',
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
        message: 'maxSelectable cannot exceed the number of available options',
        path: ['maxSelectable'],
      },
    ),
});

const addOptionToGroupValidationSchema = z.object({
  body: z
    .object({
      name: z
        .string({
          required_error:
            'Option name is strictly required (e.g., Green Olives)',
        })
        .trim(),
      price: z
        .number({
          required_error: 'Price is required',
        })
        .min(0, 'Price cannot be negative'),
      tax: z.string({
        required_error: 'Tax ID is required to comply with financial laws',
      }),
    })
    .strict(),
});

const toggleOptionStatusValidationSchema = z.object({
  body: z
    .object({
      optionSku: z.string({
        required_error: 'Option SKU is strictly required to toggle status',
      }),
    })
    .strict(),
});

const deleteOptionValidationSchema = z.object({
  body: z
    .object({
      optionSku: z
        .string({
          required_error: 'Option SKU is strictly required to delete it',
        })
        .trim(),
    })
    .strict(),
});

export const AddOnsValidation = {
  createAddonGroupValidationSchema,
  updateAddonGroupValidationSchema,
  addOptionToGroupValidationSchema,
  toggleOptionStatusValidationSchema,
  deleteOptionValidationSchema,
};
