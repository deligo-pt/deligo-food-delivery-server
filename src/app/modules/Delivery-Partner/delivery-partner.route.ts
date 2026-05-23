import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { Router } from 'express';
import { DeliveryPartnerValidation } from './delivery-partner.validation';
import { DeliveryPartnerControllers } from './delivery-partner.controller';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';
import { LocationValidation } from '../../constant/GlobalValidation/location.validation';

const router = Router();

// Delivery Partner Update Route
router.patch(
  '/:deliveryPartnerCustomId',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'DELIVERY_PARTNER'),
  validateRequest(
    DeliveryPartnerValidation.updateDeliveryPartnerDataValidationSchema,
  ),
  DeliveryPartnerControllers.updateDeliveryPartner,
);

// update delivery partner live location
router.patch(
  '/:deliveryPartnerCustomId/liveLocation',
  auth('DELIVERY_PARTNER')(),
  validateRequest(LocationValidation.UpdateLiveLocationValidationSchema),
  DeliveryPartnerControllers.updateDeliveryPartnerLiveLocation,
);

// Delivery Partner Doc Image Upload Route
router.patch(
  '/:deliveryPartnerCustomId/docImage',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'DELIVERY_PARTNER')(),
  multerUpload.single('file'),
  parseBody,
  validateRequest(
    DeliveryPartnerValidation.deliveryPartnerDocImageValidationSchema,
  ),
  DeliveryPartnerControllers.deliveryPartnerDocImageUpload,
);

// Change Delivery Partner Status Route
router.patch(
  '/status/change',
  auth('DELIVERY_PARTNER')(),
  validateRequest(
    DeliveryPartnerValidation.deliveryPartnerStatusChangeValidationSchema,
  ),
  DeliveryPartnerControllers.changeDeliveryPartnerStatus,
);

// Get All Delivery Partners Route
router.get(
  '/',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
  )('VIEW_DELIVERY_PARTNERS'),
  DeliveryPartnerControllers.getAllDeliveryPartners,
);

// Get Single Delivery Partner Route
router.get(
  '/:deliveryPartnerCustomId',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'DELIVERY_PARTNER')(),
  DeliveryPartnerControllers.getSingleDeliveryPartner,
);

export const DeliveryPartnerRoutes = router;
