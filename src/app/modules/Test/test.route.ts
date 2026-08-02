import { Router } from 'express';
import auth from '../../middlewares/auth';
import { TestController } from './test.controller';

const router = Router();

router.post(
  '/send-notification',
  auth('SUPER_ADMIN'),
  TestController.getNotificationByToken,
);

export const TestRoutes = router;
