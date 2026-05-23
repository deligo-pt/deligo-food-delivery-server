import { Router } from 'express';
import auth from '../../middlewares/auth';
import { PermissionController } from './permission.controller';
import validateRequest from '../../middlewares/validateRequest';
import { PermissionValidations } from './permission.validation';

const router = Router();

router.post(
  '/seed-permissions',
  auth('SUPER_ADMIN', 'ADMIN')(),
  PermissionController.seedPermissions,
);

router.post(
  '/create',
  auth('SUPER_ADMIN', 'ADMIN')(),
  validateRequest(PermissionValidations.createPermissionValidationSchema),
  PermissionController.createPermission,
);

router.patch(
  '/:permissionId',
  auth('SUPER_ADMIN', 'ADMIN')(),
  validateRequest(PermissionValidations.updatePermissionValidationSchema),
  PermissionController.updatePermission,
);

router.patch(
  '/assign-permissions',
  auth('SUPER_ADMIN', 'ADMIN')(),
  validateRequest(PermissionValidations.createPermissionValidationSchema),
  PermissionController.assignPermissionsToUser,
);

router.patch(
  '/revoke-permissions',
  auth('SUPER_ADMIN', 'ADMIN')(),
  validateRequest(PermissionValidations.revokePermissionsValidationSchema),
  PermissionController.revokePermissionsFromUser,
);

export const PermissionRoutes = router;
