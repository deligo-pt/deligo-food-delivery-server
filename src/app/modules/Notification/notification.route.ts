import { Router } from 'express';
import { NotificationControllers } from './notification.controller';
import auth from '../../middlewares/auth';

const router = Router();

// Get my notifications
router.get(
  '/my-notifications',
  auth('CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'FLEET_MANAGER', 'ADMIN'),
  NotificationControllers.getMyNotifications
);

// Mark one as read
router.patch(
  '/:id/read',
  auth('CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'FLEET_MANAGER', 'ADMIN'),
  NotificationControllers.markAsRead
);

// Admin get all
router.get(
  '/all',
  auth('ADMIN', 'SUPER_ADMIN'),
  NotificationControllers.getAllNotifications
);

export const NotificationRoutes = router;
