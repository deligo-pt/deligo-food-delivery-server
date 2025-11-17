import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { Router } from 'express';
import { AdminControllers } from './admin.controller';
import { AdminValidation } from './admin.validation';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';

const router = Router();

// Admin Update Route
router.patch(
  '/:adminId',
  auth('ADMIN', 'SUPER_ADMIN'),
  multerUpload.single('file'),
  parseBody,
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
