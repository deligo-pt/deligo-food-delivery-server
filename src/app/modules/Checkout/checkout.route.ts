import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CheckoutController } from './checkout.controller';
import { CheckoutValidation } from './checkout.validation';

const router = Router();

// checkout
router.post(
  '/',
  auth('CUSTOMER'),
  validateRequest(CheckoutValidation.checkoutValidationSchema),
  CheckoutController.checkout
);

// get checkout summary
router.get(
  '/summary/:checkoutSummaryId',
  auth('CUSTOMER'),
  CheckoutController.getCheckoutSummary
);

export const CheckoutRoutes = router;
