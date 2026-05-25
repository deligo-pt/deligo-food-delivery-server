import { Router } from 'express';
import auth from '../../middlewares/auth';
import { PermissionController } from './permission.controller';
import validateRequest from '../../middlewares/validateRequest';
import { PermissionValidations } from './permission.validation';
import { SYSTEM_PERMISSIONS } from './permission.constant';

const router = Router();

router.post(
  '/seed-permissions',
  auth('SUPER_ADMIN')(),
  PermissionController.seedPermissions,
);

router.patch(
  '/assign-permissions',
  auth('SUPER_ADMIN', 'ADMIN')(SYSTEM_PERMISSIONS.MANAGE_PERMISSION),
  validateRequest(PermissionValidations.assignPermissionsValidationSchema),
  PermissionController.assignPermissionsToUser,
);

router.patch(
  '/revoke-permissions',
  auth('SUPER_ADMIN', 'ADMIN')(SYSTEM_PERMISSIONS.MANAGE_PERMISSION),
  validateRequest(PermissionValidations.revokePermissionsValidationSchema),
  PermissionController.revokePermissionsFromUser,
);

router.post(
  '/create',
  auth('SUPER_ADMIN', 'ADMIN')(SYSTEM_PERMISSIONS.CREATE_PERMISSION),
  validateRequest(PermissionValidations.createPermissionValidationSchema),
  PermissionController.createPermission,
);

router.patch(
  '/:permissionId',
  auth('SUPER_ADMIN', 'ADMIN')(SYSTEM_PERMISSIONS.UPDATE_PERMISSION),
  validateRequest(PermissionValidations.updatePermissionValidationSchema),
  PermissionController.updatePermission,
);

router.get(
  '/',
  auth('SUPER_ADMIN', 'ADMIN')(SYSTEM_PERMISSIONS.VIEW_PERMISSIONS),
  PermissionController.getAllPermissions,
);

export const PermissionRoutes = router;
