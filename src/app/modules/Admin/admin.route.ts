import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { Router } from 'express';
import { AdminControllers } from './admin.controller';
import { AdminValidation } from './admin.validation';
import { GlobalSettingControllers } from '../GlobalSetting/globalSetting.controller';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';

const router = Router();

// Admin Update Route
router.patch(
  '/:adminId',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(AdminValidation.updateAdminDataValidationSchema),
  AdminControllers.updateAdmin
);

// admin doc image upload route
router.patch(
  '/:adminId/docImage',
  auth('ADMIN', 'SUPER_ADMIN'),
  multerUpload.single('file'),
  parseBody,
  validateRequest(AdminValidation.adminDocImageValidationSchema),
  AdminControllers.adminDocImageUpload
);

// get all admin route
router.get('/', auth('ADMIN', 'SUPER_ADMIN'), AdminControllers.getAllAdmins);

// get single admin route
router.get(
  '/:adminId',
  auth('ADMIN', 'SUPER_ADMIN'),
  AdminControllers.getSingleAdmin
);

// get per meter rate
router.get(
  '/perMeterRate',
  auth('SUPER_ADMIN'),
  GlobalSettingControllers.getPerMeterRate
);

export const AdminRoutes = router;
