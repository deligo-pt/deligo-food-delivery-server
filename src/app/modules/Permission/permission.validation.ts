import { z } from 'zod';

const createPermissionValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'Permission name is required',
      })
      .trim(),
    action: z
      .string({
        required_error: 'Permission action code is required',
      })
      .trim()
      .toUpperCase(),
    module: z
      .string({
        required_error: 'Module name is required',
      })
      .trim(),
    description: z.string().trim().optional(),
    isSystemDefined: z.boolean().default(false).optional(),
  }),
});

const updatePermissionValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().optional(),
    action: z.string().trim().toUpperCase().optional(),
    module: z.string().trim().optional(),
    description: z.string().trim().optional(),
    isSystemDefined: z.boolean().optional(),
  }),
});

export const PermissionValidations = {
  createPermissionValidationSchema,
  updatePermissionValidationSchema,
};
