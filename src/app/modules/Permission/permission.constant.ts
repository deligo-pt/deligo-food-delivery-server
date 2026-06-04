import { z } from 'zod';

// ১. মেইন অ্যারে লিস্ট (একদম এক জায়গায় থাকবে ভাই 🎉)
export const VALID_PERMISSION_ACTIONS = [
  'CAN_VIEW_DASHBOARD',
  'CAN_MANAGE_ADMINS',
  'CAN_MANAGE_VENDORS',
  'CAN_MANAGE_PARTNERS',
  'CAN_MANAGE_CUSTOMERS',
  'CAN_MANAGE_ORDERS',
  'CAN_MANAGE_ADDON',
  'CAN_MANAGE_PERMISSIONS',
  'CAN_MANAGE_BANNER',
  'CAN_MANAGE_COUPONS',
  'CAN_MANAGE_COMPLAINTS',
  'CAN_VIEW_ANALYTICS',
  'CAN_MANAGE_SYSTEM_SETTINGS',
] as const;

export const permissionActionZodSchema = z.enum(VALID_PERMISSION_ACTIONS);

export type TPermissionAction = z.infer<typeof permissionActionZodSchema>;
