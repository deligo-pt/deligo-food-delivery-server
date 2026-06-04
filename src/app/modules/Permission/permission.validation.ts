import mongoose from 'mongoose';
import { z } from 'zod';
import { permissionActionZodSchema } from './permission.constant';

const createPermissionValidationSchema = z.object({
  body: z
    .object({
      name: z.string({ required_error: 'Permission name is required' }).trim(),

      action: permissionActionZodSchema,

      module: z.string({ required_error: 'Module name is required' }).trim(),
      displayName: z.string().trim().optional(),
      description: z.string().trim().optional(),
      isSystemDefined: z.boolean().default(false).optional(),
      isActive: z.boolean().default(true).optional(),
    })
    .strict(),
});

const updatePermissionValidationSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(3, 'Permission name must be at least 3 characters long')
        .optional(),

      action: permissionActionZodSchema.optional(),

      module: z.string().trim().optional(),
      displayName: z.string().trim().optional(),
      description: z
        .string()
        .trim()
        .max(500, 'Description cannot exceed 500 characters')
        .optional(),
      isSystemDefined: z.boolean().optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
});

const assignPermissionsValidationSchema = z.object({
  body: z.object({
    permissions: z.array(
      z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: 'Invalid Permission ID format provided',
      }),
      {
        required_error:
          'Permissions array containing MongoDB ObjectIds is required',
      },
    ),
  }),
});

export const PermissionValidations = {
  createPermissionValidationSchema,
  updatePermissionValidationSchema,
  assignPermissionsValidationSchema,
};
