import { Router } from 'express';
import auth from '../../middlewares/auth';
import { GlobalSettingControllers } from './globalSetting.controller';
import validateRequest from '../../middlewares/validateRequest';
import { GlobalSettingValidation } from './globalSetting.validation';

const router = Router();

// create global setting route
router.post(
  '/create',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(GlobalSettingValidation.createGlobalSettingValidationSchema),
  GlobalSettingControllers.createGlobalSettings
);

// update global setting route
router.patch(
  '/update',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(GlobalSettingValidation.updateGlobalSettingValidationSchema),
  GlobalSettingControllers.updateGlobalSettings
);

// get all global setting route
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN'),
  GlobalSettingControllers.getGlobalSettingsForAdmin
);

export const GlobalSettingRoutes = router;
