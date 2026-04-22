import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PointsController } from './points.controller';
import { PointsValidation } from './points.validation';

const router = Router();

router.post(
  '/add-order-points',
  auth('CUSTOMER'),
  validateRequest(PointsValidation.addOrderPointsValidationSchema),
  PointsController.addOrderPoints,
);

router.post(
  '/add-rider-points',
  auth('DELIVERY_PARTNER'),
  validateRequest(PointsValidation.addDeliveryPartnerPointsValidationSchema),
  PointsController.addDeliveryPartnerPoints,
);

router.get(
  '/my-points',
  auth('CUSTOMER', 'DELIVERY_PARTNER'),
  PointsController.getMyPoints,
);

router.get(
  '/all-points',
  auth('ADMIN', 'SUPER_ADMIN'),
  PointsController.getAllPoints,
);

export const PointsRoutes = router;
