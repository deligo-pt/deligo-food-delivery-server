import { Router } from 'express';
import { LoyaltyController } from './loyalty.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { LoyaltyValidation } from './loyalty.validation';

const router = Router();

router.post(
  '/add-order-points',
  auth('CUSTOMER'),
  validateRequest(LoyaltyValidation.addOrderPointsValidationSchema),
  LoyaltyController.addOrderPoints,
);

router.post(
  '/add-rider-points',
  auth('DELIVERY_PARTNER'),
  validateRequest(LoyaltyValidation.addDeliveryPartnerPointsValidationSchema),
  LoyaltyController.addDeliveryPartnerPoints,
);

export const LoyaltyRoutes = router;
