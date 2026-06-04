import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PermissionControllers } from './permission.controller';
import { PermissionValidations } from './permission.validation';

const router = express.Router();

router.post(
  '/create',
  auth('SUPER_ADMIN', 'ADMIN', ['CAN_MANAGE_PERMISSIONS']),
  validateRequest(PermissionValidations.createPermissionValidationSchema),
  PermissionControllers.createPermission,
);

router.patch(
  '/:permissionId',
  auth('SUPER_ADMIN', 'ADMIN', ['CAN_MANAGE_PERMISSIONS']),
  validateRequest(PermissionValidations.updatePermissionValidationSchema),
  PermissionControllers.updatePermission,
);

router.get(
  '/',
  auth('SUPER_ADMIN', 'ADMIN'),
  PermissionControllers.getAllPermissions,
);

router.get(
  '/:permissionId',
  auth('SUPER_ADMIN', 'ADMIN'),
  PermissionControllers.getSinglePermission,
);

router.delete(
  '/:permissionId',
  auth('SUPER_ADMIN', 'ADMIN', ['CAN_MANAGE_PERMISSIONS']),
  PermissionControllers.deletePermission,
);

router.patch(
  '/assign-permissions/:adminId',
  auth('SUPER_ADMIN', 'ADMIN', ['CAN_MANAGE_PERMISSIONS']),
  validateRequest(PermissionValidations.assignPermissionsValidationSchema),
  PermissionControllers.assignPermissionsToAdmin,
);

router.patch(
  '/revoke-permissions/:adminId',
  auth('SUPER_ADMIN', 'ADMIN', ['CAN_MANAGE_PERMISSIONS']),
  validateRequest(PermissionValidations.assignPermissionsValidationSchema),
  PermissionControllers.revokePermissionsFromAdmin,
);

export const PermissionRoutes = router;
