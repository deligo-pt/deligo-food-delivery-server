import { Router } from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { IngredientOrderValidation } from '../Ingredient-Order/ing-order.validation';

const router = Router();

// create redUniq payment intent
router.post(
  '/reduniq/create-payment-intent',
  auth('CUSTOMER'),
  PaymentController.createRedUniqPayment,
);

// handle payment failure
router.post(
  '/reduniq/handle-payment-failure/:checkoutSummaryId',
  auth('CUSTOMER'),
  PaymentController.handlePaymentFailure,
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
