import { Router } from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { IngredientOrderValidation } from '../Ingredient-Order/ing-order.validation';
import { PaymentTokenValidation } from '../Payment-Token/payment-token.validation';

const router = Router();

// create redUniq payment intent (Endpoint 1 — pass saveCard: true to tokenize the card)
router.post(
  '/reduniq/create-payment-intent',
  auth('CUSTOMER'),
  PaymentController.createRedUniqPayment,
);

// Endpoint 3: pay with a saved card token (one-click checkout)
router.post(
  '/reduniq/pay-with-saved-token',
  auth('CUSTOMER'),
  validateRequest(PaymentTokenValidation.payWithSavedTokenValidationSchema),
  PaymentController.payWithSavedToken,
);

// Endpoint 4: REDUNIQ notification/webhook callback — no auth, called by the gateway itself
router.post(
  '/reduniq/notification',
  PaymentController.handleReduniqNotification,
);

// handle payment failure
router.post(
  '/reduniq/handle-payment-failure/:checkoutSummaryId',
  auth('CUSTOMER'),
  PaymentController.handlePaymentFailure,
);

// refund redUniq payment
router.post(
  '/reduniq/refund/:orderId',
  auth('ADMIN', 'SUPER_ADMIN'),
  PaymentController.refundRedUniqPayment,
);

// create ingredient redUniq payment intent
router.post(
  '/ingredient/create-payment-intent',
  auth('VENDOR', 'SUB_VENDOR'),
  validateRequest(
    IngredientOrderValidation.createIngredientOrderValidationSchema,
  ),
  PaymentController.createIngredientRedUniqPayment,
);

export const PaymentRoutes = router;
