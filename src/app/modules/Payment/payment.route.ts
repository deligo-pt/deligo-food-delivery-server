import { Router } from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';

const router = Router();

// create stripe payment intent
router.post(
  '/stripe/create-payment-intent',
  auth('CUSTOMER'),
  PaymentController.createPaymentIntent,
);

// create reduniq payment intent
router.post(
  '/reduniq/create-payment-intent',
  auth('CUSTOMER'),
  PaymentController.createReduniqPayment,
);

export const PaymentRoutes = router;
