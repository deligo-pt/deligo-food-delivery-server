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

// mark all as read
router.patch(
  '/all/read',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'FLEET_MANAGER'
  ),
  NotificationControllers.markAllAsRead
);

// Admin get all
router.get(
  '/all',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'FLEET_MANAGER'
  ),
  NotificationControllers.getAllNotifications
);

export const NotificationRoutes = router;
