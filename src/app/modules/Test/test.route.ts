import { Router } from 'express';
import { TestController } from './test.controller';

const router = Router();

router.post('/', TestController.getNotificationByToken);

export const TestRoutes = router;
