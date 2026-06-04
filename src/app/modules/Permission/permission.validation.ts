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
  body: z.object({
    name: z.string().trim().optional(),
    action: z.string().trim().toUpperCase().optional(),
    module: z.string().trim().optional(),
    description: z.string().trim().optional(),
    isSystemDefined: z.boolean().optional(),
  }),
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
