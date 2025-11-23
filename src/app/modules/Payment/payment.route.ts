import { Router } from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';

const router = Router();

// create payment session
router.post(
  '/create-session',
  auth('CUSTOMER'),
  PaymentController.createPaymentSessionController
);

export const PaymentRoutes = router;
