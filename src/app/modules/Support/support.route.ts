import { Router } from 'express';
import { SupportControllers } from './support.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SupportValidation } from './support.validation';

const router = Router();

// Open or create new conversation
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

// Get all conversations (Admin only)
router.get(
  '/conversations',
  auth('ADMIN', 'SUPER_ADMIN'),
  SupportControllers.getAllSupportConversationsController
);

// Store message in conversation (with rate limit)
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

// Get messages by room (User sees own, Admin sees all)
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
  SupportControllers.getMessagesByRoomController
);

// Mark messages read (both Admin & User)
router.patch(
  '/conversation/:room/read',
  auth(
    'ADMIN',
    'VENDOR',
    'CUSTOMER',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
    'SUPER_ADMIN'
  ),
  SupportControllers.markReadByAdminOrUserController
);

export const SupportRoutes = router;
