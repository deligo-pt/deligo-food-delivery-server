import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { Router } from 'express';
import { DeliveryPartnerValidation } from './delivery-partner.validation';
import { DeliveryPartnerControllers } from './delivery-partner.controller';
import { GlobalValidation } from '../../constant/GlobalValidation/global.validation';

const router = Router();

// Delivery Partner Update Route
router.patch(
  '/:deliveryPartnerId',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'DELIVERY_PARTNER'),
  validateRequest(
    DeliveryPartnerValidation.updateDeliveryPartnerDataValidationSchema,
  ),
  DeliveryPartnerControllers.updateDeliveryPartner,
);

// update delivery partner live location
router.patch(
  '/:deliveryPartnerId/liveLocation',
  auth('DELIVERY_PARTNER'),
  validateRequest(GlobalValidation.UpdateLiveLocationValidationSchema),
  DeliveryPartnerControllers.updateDeliveryPartnerLiveLocation,
);

// Change Delivery Partner Status Route
router.patch(
  '/status/change',
  auth('DELIVERY_PARTNER'),
  validateRequest(
    DeliveryPartnerValidation.deliveryPartnerStatusChangeValidationSchema,
  ),
  DeliveryPartnerControllers.changeDeliveryPartnerStatus,
);

// Get All Delivery Partners Route
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  DeliveryPartnerControllers.getAllDeliveryPartners,
);

// Get Single Delivery Partner Route
router.get(
  '/:deliveryPartnerId',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'DELIVERY_PARTNER'),
  DeliveryPartnerControllers.getSingleDeliveryPartner,
);

export const DeliveryPartnerRoutes = router;
