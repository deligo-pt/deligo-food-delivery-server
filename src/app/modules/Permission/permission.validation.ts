import { z } from 'zod';
import { PermissionActions } from './permission.model';

const createPermissionValidationSchema = z.object({
  body: z
    .object({
      name: z
        .string({
          required_error: 'Permission name is required',
        })
        .trim()
        .min(1, 'Permission name cannot be empty')
        .transform((val) => val.toUpperCase()),

      action: z.enum(PermissionActions, {
        required_error: 'Action is required',
        invalid_type_error:
          'Action must be either CREATE, READ, UPDATE, or DELETE',
      }),

      subject: z
        .string({
          required_error: 'Subject/Module name is required',
        })
        .trim()
        .min(1, 'Subject cannot be empty'),

      description: z
        .string()
        .trim()
        .max(500, 'Description cannot exceed 500 characters')
        .optional(),
    })
    .strict(),
});

const updatePermissionValidationSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, 'Permission name cannot be empty')
        .transform((val) => val.toUpperCase())
        .optional(),

      action: z.enum(PermissionActions).optional(),

      subject: z.string().trim().min(1, 'Subject cannot be empty').optional(),

      description: z
        .string()
        .trim()
        .max(500, 'Description cannot exceed 500 characters')
        .optional(),
    })
    .strict(),
});

export const PermissionValidations = {
  createPermissionValidationSchema,
  updatePermissionValidationSchema,
};
