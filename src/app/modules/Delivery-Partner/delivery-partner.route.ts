import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { Router } from 'express';
import { DeliveryPartnerValidation } from './delivery-partner.validation';
import { DeliveryPartnerControllers } from './delivery-partner.controller';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';

const router = Router();

// Delivery Partner Update Route
router.patch(
  '/:deliveryPartnerId',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  validateRequest(
    DeliveryPartnerValidation.updateDeliveryPartnerDataValidationSchema
  ),
  DeliveryPartnerControllers.updateDeliveryPartner
);

// update delivery partner live location
router.patch(
  '/:deliveryPartnerId/liveLocation',
  auth('DELIVERY_PARTNER'),
  validateRequest(
    DeliveryPartnerValidation.updateDeliveryPartnerLiveLocationValidationSchema
  ),
  DeliveryPartnerControllers.updateDeliveryPartnerLiveLocation
);

// Delivery Partner Doc Image Upload Route
router.patch(
  '/:deliveryPartnerId/docImage',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  multerUpload.single('file'),
  parseBody,
  validateRequest(
    DeliveryPartnerValidation.deliveryPartnerDocImageValidationSchema
  ),
  DeliveryPartnerControllers.deliveryPartnerDocImageUpload
);

// Get All Delivery Partners Route
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  DeliveryPartnerControllers.getAllDeliveryPartners
);

// Get Single Delivery Partner Route
router.get(
  '/:deliveryPartnerId',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'DELIVERY_PARTNER'),
  DeliveryPartnerControllers.getSingleDeliveryPartner
);

export const DeliveryPartnerRoutes = router;
