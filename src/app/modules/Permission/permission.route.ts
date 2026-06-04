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

router.get(
  '/',
  auth('SUPER_ADMIN', 'ADMIN'),
  PermissionControllers.getAllPermissions,
);

router.get(
  '/:id',
  auth('SUPER_ADMIN', 'ADMIN'),
  PermissionControllers.getSinglePermission,
);

router.patch(
  '/:id',
  auth('SUPER_ADMIN', 'ADMIN', ['CAN_MANAGE_PERMISSIONS']),
  validateRequest(PermissionValidations.updatePermissionValidationSchema),
  PermissionControllers.updatePermission,
);

router.delete(
  '/:id',
  auth('SUPER_ADMIN', 'ADMIN', ['CAN_MANAGE_PERMISSIONS']),
  PermissionControllers.deletePermission,
);

export const PermissionRoutes = router;
