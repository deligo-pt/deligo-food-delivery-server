import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { SupportValidation } from './support.validation';
import { SupportControllers } from './support.controller';
import auth from '../../middlewares/auth';

const router = Router();

// Route to open or create a support conversation
router.post(
  '/conversation',
  auth(
    'ADMIN',
    'VENDOR',
    'CUSTOMER',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
    'SUPER_ADMIN'
  ),
  SupportControllers.openOrCreateConversationController
);

// Route to get all support conversations
router.get(
  '/conversations',
  auth('ADMIN', 'SUPER_ADMIN'),
  SupportControllers.getAllSupportConversations
);

// Route to store a support message
router.post(
  '/message',
  auth(
    'ADMIN',
    'VENDOR',
    'CUSTOMER',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
    'SUPER_ADMIN'
  ),
  validateRequest(SupportValidation.sendMessageSchema),
  SupportControllers.storeSupportMessageController
);

// Route to get messages by room
router.get(
  '/:room/messages',
  auth(
    'ADMIN',
    'VENDOR',
    'CUSTOMER',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
    'SUPER_ADMIN'
  ),
  SupportControllers.getMessagesByRoom
);

// Route to mark messages as read by admin or user
router.patch(
  '/message/read',
  auth(
    'ADMIN',
    'VENDOR',
    'CUSTOMER',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
    'SUPER_ADMIN'
  ),
  validateRequest(SupportValidation.readMessageSchema),
  SupportControllers.markMessagesAsRead
);

export const SupportRoutes = router;
