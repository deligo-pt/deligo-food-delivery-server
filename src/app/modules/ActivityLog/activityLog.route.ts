import { Router } from 'express';
import { ActivityLogControllers } from './activityLog.controller';
import auth from '../../middlewares/auth';

const router = Router();

router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', ['CAN_MANAGE_ACTIVITY_LOGS']),
  ActivityLogControllers.getAllActivityLogs,
);

router.get(
  '/:id',
  auth('ADMIN', 'SUPER_ADMIN', ['CAN_MANAGE_ACTIVITY_LOGS']),
  ActivityLogControllers.getSingleActivityLog,
);

export const ActivityLogRoutes = router;
