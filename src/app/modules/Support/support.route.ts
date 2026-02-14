import { Router } from 'express';
import { SupportControllers } from './support.controller';
import auth from '../../middlewares/auth';

const router = Router();

/**
 * ------------------------------------------------------
 * Create or open a conversation
 * - SUPPORT  : all roles → admin
 * - DIRECT   : customer ↔ vendor (future)
 * - ORDER    : order based chat (future)
 * ------------------------------------------------------
 */
router.post(
  '/conversation',
  auth(
    'ADMIN',
    'VENDOR',
    'CUSTOMER',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
    'SUPER_ADMIN',
  ),
  SupportControllers.openOrCreateConversation,
);

/**
 * ------------------------------------------------------
 * Get conversation list
 * - ADMIN / SUPER_ADMIN : see all
 * - Others              : see only own conversations
 * ------------------------------------------------------
 */
router.get(
  '/conversations',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'VENDOR',
    'SUB_VENDOR',
    'CUSTOMER',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
  ),
  SupportControllers.getAllSupportConversations,
);

/**
 * ------------------------------------------------------
 * Get single conversation
 * - ADMIN / SUPER_ADMIN : see all
 * - Others              : see only own conversations
 * ------------------------------------------------------
 */
router.get(
  '/conversations/:room',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'VENDOR',
    'SUB_VENDOR',
    'CUSTOMER',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
  ),
  SupportControllers.getSingleSupportConversation,
);

/**
 * ------------------------------------------------------
 * Get messages of a conversation (by room)
 * - Only participants can access
 * ------------------------------------------------------
 */
router.get(
  '/conversations/:room/messages',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'VENDOR',
    'CUSTOMER',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
  ),
  SupportControllers.getMessagesByRoom,
);

/**
 * ------------------------------------------------------
 * Mark messages as read
 * - Generic (participant based)
 * ------------------------------------------------------
 */
router.patch(
  '/conversations/:room/read',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'VENDOR',
    'CUSTOMER',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
  ),
  SupportControllers.markReadByAdminOrUser,
);

// ------------------------------------------------------
//  Get total unread count
// ------------------------------------------------------
router.get(
  '/unread-count',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'VENDOR',
    'CUSTOMER',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
  ),
  SupportControllers.getTotalUnreadCount,
);

/**
 * ------------------------------------------------------
 * Close conversation (lock release)
 * - Only handler (handledBy) can close
 * ------------------------------------------------------
 */
router.patch(
  '/conversations/:room/close',
  auth('ADMIN', 'SUPER_ADMIN'),
  SupportControllers.closeConversation,
);

export const SupportRoutes = router;
