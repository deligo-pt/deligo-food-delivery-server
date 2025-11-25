import auth from '../../middlewares/auth';
import { ProfileController } from './profile.controller';
import { multerUpload } from '../../config/multer.config';
import { Router } from 'express';
import { parseBody } from '../../middlewares/bodyParser';
import validateRequest from '../../middlewares/validateRequest';
import { ProfileValidation } from './profile.validation';

const router = Router();

// get my profile route
router.get(
  '/',
  auth(
    'ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'FLEET_MANAGER',
    'VENDOR',
    'SUPER_ADMIN'
  ),
  ProfileController.getMyProfile
);

// update my profile route
router.patch(
  '/',
  auth(
    'ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'FLEET_MANAGER',
    'VENDOR',
    'SUPER_ADMIN'
  ),
  multerUpload.single('file'),
  parseBody,
  validateRequest(ProfileValidation.userProfileUpdateValidationSchema),
  ProfileController.updateMyProfile
);

export const ProfileRoutes = router;
