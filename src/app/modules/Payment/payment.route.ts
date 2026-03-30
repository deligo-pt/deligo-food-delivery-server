import { Router } from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { IngredientOrderValidation } from '../Ingredient-Order/ing-order.validation';

const router = Router();

// create reduniq payment intent
router.post(
  '/reduniq/create-payment-intent',
  auth('CUSTOMER'),
  PaymentController.createReduniqPayment,
);

// handle payment failure
router.post(
  '/reduniq/handle-payment-failure/:checkoutSummaryId',
  auth('CUSTOMER'),
  PaymentController.handlePaymentFailure,
);

// create ingredient reduniq payment intent
router.post(
  '/ingredient/create-payment-intent',
  auth('VENDOR', 'SUB_VENDOR'),
  validateRequest(IngredientOrderValidation.createIngredientOrderValidationSchema),
  PaymentController.createIngredientRequniqPayment,
);

export const PaymentRoutes = router;
