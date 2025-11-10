import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { Router } from 'express';
import { AdminControllers } from './admin.controller';
import { AdminValidation } from './admin.validation';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';

const router = Router();

// User Update Route
router.patch(
  '/:userId',
  auth('ADMIN', 'SUPER_ADMIN'),
  multerUpload.single('file'),
  parseBody,
  validateRequest(AdminValidation.updateAdminDataValidationSchema),
  AdminControllers.updateAdmin
);

// get all admin route
router.get('/', auth('ADMIN', 'SUPER_ADMIN'), AdminControllers.getAllAdmins);

export const AdminRoutes = router;
