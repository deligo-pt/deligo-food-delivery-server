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

router.patch(
  '/assign-permissions',
  auth('SUPER_ADMIN', 'ADMIN')(),
  validateRequest(PermissionValidations.createPermissionValidationSchema),
  PermissionController.assignPermissionsToUser,
);

export const PermissionRoutes = router;
