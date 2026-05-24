import { z } from 'zod';
import { PERMISSION_SUBJECTS, PermissionActions } from './permission.constant';
import { Types } from 'mongoose';

const isValidObjectId = (val: string) => Types.ObjectId.isValid(val);

const createPermissionValidationSchema = z.object({
  body: z
    .object({
      action: z.enum(PermissionActions, {
        required_error: 'Action is required (CREATE, READ, UPDATE, or DELETE)',
      }),
      subject: z.enum(PERMISSION_SUBJECTS, {
        required_error:
          'Subject/Module name is required (e.g., DeliveryPartner, Order)',
      }),
      description: z.string().trim().optional(),
    })
    .strict(),
});

const updatePermissionValidationSchema = z.object({
  body: z
    .object({
      action: z.enum(PermissionActions).optional(),

      subject: z.enum(PERMISSION_SUBJECTS).optional(),

      description: z
        .string()
        .trim()
        .max(500, 'Description cannot exceed 500 characters')
        .optional(),
    })
    .strict(),
});

const assignPermissionsValidationSchema = z.object({
  body: z
    .object({
      userCustomId: z
        .string({
          required_error: 'User Custom ID is required',
        })
        .trim()
        .min(1, 'User Custom ID cannot be empty'),

      permissionIds: z
        .array(
          z
            .string({
              invalid_type_error: 'Each Permission ID must be a valid string',
            })
            .refine(isValidObjectId, {
              message: 'Invalid Permission Object ID format',
            }),
          {
            required_error: 'Permission IDs array is required',
          },
        )
        .min(1, 'At least one Permission ID must be provided inside the array'),
    })
    .strict(),
});

const revokePermissionsValidationSchema = z.object({
  body: z
    .object({
      userCustomId: z
        .string({
          required_error: 'User Custom ID is required',
        })
        .trim(),

      permissionIds: z
        .array(
          z.string({
            invalid_type_error: 'Each Permission ID must be a valid string',
          }),
          {
            required_error: 'Permission IDs array is required to revoke',
          },
        )
        .min(1, 'At least one Permission ID must be provided to revoke'),
    })
    .strict(),
});

export const PermissionValidations = {
  createPermissionValidationSchema,
  updatePermissionValidationSchema,
  assignPermissionsValidationSchema,
  revokePermissionsValidationSchema,
};
