import { Router } from 'express';
import { NotificationControllers } from './notification.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { NotificationValidation } from './notification.validation';

const router = Router();

// Get my notifications
router.get(
  '/my-notifications',
  auth(
    'CUSTOMER',
    'VENDOR',
    'SUB_VENDOR',
    'DELIVERY_PARTNER',
    'FLEET_MANAGER',
    'ADMIN',
    'SUPER_ADMIN'
  ),
  NotificationControllers.getMyNotifications
);

// Mark one as read
router.patch(
  '/:id/read',
  auth(
    'CUSTOMER',
    'VENDOR',
    'SUB_VENDOR',
    'DELIVERY_PARTNER',
    'FLEET_MANAGER',
    'ADMIN',
    'SUPER_ADMIN'
  ),
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
    'SUB_VENDOR',
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
    'SUB_VENDOR',
    'FLEET_MANAGER'
  ),
  NotificationControllers.getAllNotifications
);

// soft delete single notification
router.delete(
  '/:id/soft-delete',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'SUB_VENDOR',
    'FLEET_MANAGER'
  ),
  NotificationControllers.softDeleteSingleNotification
);

// soft delete multiple notifications
router.delete(
  '/soft-delete',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'SUB_VENDOR',
    'FLEET_MANAGER'
  ),
  validateRequest(
    NotificationValidation.deleteMultipleNotificationsValidationSchema
  ),
  NotificationControllers.softDeleteMultipleNotifications
);

// soft delete all notifications
router.delete(
  '/soft-delete-all',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'SUB_VENDOR',
    'FLEET_MANAGER'
  ),
  NotificationControllers.softDeleteAllNotifications
);

// permanent delete single notification
router.delete(
  '/:id/permanent-delete',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'SUB_VENDOR',
    'FLEET_MANAGER'
  ),
  NotificationControllers.permanentDeleteSingleNotification
);

// permanent delete multiple notifications
router.delete(
  '/permanent-delete',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'SUB_VENDOR',
    'FLEET_MANAGER'
  ),
  validateRequest(
    NotificationValidation.deleteMultipleNotificationsValidationSchema
  ),
  NotificationControllers.permanentDeleteMultipleNotifications
);

// permanent delete all notifications
router.delete(
  '/permanent-delete-all',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'SUB_VENDOR',
    'FLEET_MANAGER'
  ),
  NotificationControllers.permanentDeleteAllNotifications
);

export const NotificationRoutes = router;
