import { Router } from 'express';
import auth from '../../middlewares/auth';
import { SupportControllers } from './support.controller';
import validateRequest from '../../middlewares/validateRequest';
import { SupportValidation } from './support.validation';

const router = Router();

// Send message (Handles both first contact and ongoing chat)
router.post(
  '/send-message',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'VENDOR',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
  ),
  validateRequest(SupportValidation.sendMessageSchema),
  SupportControllers.sendMessage,
);

// Admin view only
router.get(
  '/tickets',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'VENDOR',
    'SUB_VENDOR',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
  ),
  SupportControllers.getAllTickets,
);

// Shared chat history access
router.get(
  '/tickets/:ticketId/messages',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'VENDOR',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
  ),
  SupportControllers.getMessagesByTicketId,
);

// Marking read
router.patch(
  '/tickets/:ticketId/read',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'VENDOR',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
  ),
  SupportControllers.markAsRead,
);

// Closing session
router.patch(
  '/tickets/:ticketId/close',
  auth('ADMIN', 'SUPER_ADMIN'),
  SupportControllers.closeTicket,
);

export const SupportRoutes = router;
