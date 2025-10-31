import express from 'express';
import auth from '../../middlewares/auth';
import { ProfileController } from './profile.controller';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';
import { USER_ROLE } from '../User/user.constant';

const router = express.Router();

router.get(
  '/',
  auth(USER_ROLE.ADMIN, USER_ROLE.CUSTOMER),
  ProfileController.getMyProfile
);

router.patch(
  '/',
  auth(USER_ROLE.ADMIN, USER_ROLE.CUSTOMER),
  multerUpload.single('profilePhoto'),
  parseBody,
  ProfileController.updateMyProfile
);

export const ProfileRoutes = router;
