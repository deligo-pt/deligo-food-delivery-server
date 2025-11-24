import { Router } from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';

const router = Router();

// create stripe payment intent
router.post(
  '/stripe/create-payment-intent',
  auth('CUSTOMER'),
  PaymentController.createPaymentIntent
);

export const PaymentRoutes = router;
