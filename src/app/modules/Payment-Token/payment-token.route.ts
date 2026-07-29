import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentTokenController } from './payment-token.controller';
import { PaymentTokenValidation } from './payment-token.validation';

const router = Router();

// save card standalone (profile management flow, no order attached)
router.post(
  '/save-card',
  auth('CUSTOMER'),
  validateRequest(PaymentTokenValidation.saveCardStandaloneValidationSchema),
  PaymentTokenController.createStandaloneCardToken,
);

// list saved cards (masked)
router.get('/', auth('CUSTOMER'), PaymentTokenController.listSavedCards);

// disable/remove a saved card
router.patch(
  '/:paymentTokenId/disable',
  auth('CUSTOMER'),
  PaymentTokenController.disableSavedCard,
);

export const PaymentTokenRoutes = router;
