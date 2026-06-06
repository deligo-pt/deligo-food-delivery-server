import { z } from 'zod';

export const VALID_PERMISSION_ACTIONS = [
  'CAN_VIEW_DASHBOARD',
  'CAN_MANAGE_ADMINS',
  'CAN_MANAGE_VENDORS',
  'CAN_MANAGE_PARTNERS',
  'CAN_MANAGE_FLEET',
  'CAN_MANAGE_CUSTOMERS',
  'CAN_MANAGE_ORDERS',
  'CAN_MANAGE_PERMISSIONS',
  'CAN_MANAGE_COUPONS',
  'CAN_VIEW_ANALYTICS',
  'CAN_MANAGE_SYSTEM_SETTINGS',
  'CAN_MANAGE_AGREEMENTS',
] as const;

export const permissionActionZodSchema = z.enum(VALID_PERMISSION_ACTIONS);

export type TPermissionAction = z.infer<typeof permissionActionZodSchema>;
