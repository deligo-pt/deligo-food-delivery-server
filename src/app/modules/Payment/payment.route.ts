import { Router } from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';

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

export const PaymentRoutes = router;
