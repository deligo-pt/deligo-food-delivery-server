import { Router } from 'express';
import { PaymentController } from './payment.controller';

const router = Router();

// payment routes

router.post('/process', PaymentController.processPaymentController);

export const PaymentRoutes = router;
