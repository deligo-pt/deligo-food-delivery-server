import auth from '../../middlewares/auth';
import { ProfileController } from './profile.controller';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';
import { Router } from 'express';

const router = Router();

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
  ProfileController.updateMyProfile
);

export const ProfileRoutes = router;
