import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { Router } from 'express';
import { AdminControllers } from './admin.controller';
import { AdminValidation } from './admin.validation';

const router = Router();

// User Update Route
router.patch(
  '/:userId',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(AdminValidation.updateAdminDataValidationSchema),
  AdminControllers.updateAdmin
);

// get all admin route
router.get('/', auth('ADMIN', 'SUPER_ADMIN'), AdminControllers.getAllAdmins);

// get single admin route
router.get(
  '/:adminId',
  auth('ADMIN', 'SUPER_ADMIN'),
  AdminControllers.getSingleAdmin
);

export const AdminRoutes = router;
