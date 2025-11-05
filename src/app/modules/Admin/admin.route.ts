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

export const AdminRoutes = router;
