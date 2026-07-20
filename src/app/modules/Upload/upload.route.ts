import { Router } from 'express';
import auth from '../../middlewares/auth';
import { multerUpload } from '../../config/multer.config';
import { UploadControllers } from './upload.controller';
import { parseBody } from '../../middlewares/bodyParser';

const router = Router();

router.post(
  '/',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'VENDOR',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
  ),
  multerUpload.array('files', 5),
  parseBody,
  UploadControllers.uploadFiles,
);

export const UploadRoutes = router;
