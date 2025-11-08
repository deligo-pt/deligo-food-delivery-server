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
  auth('ADMIN', 'SUPER_ADMIN', 'DELIVERY_PARTNER'),
  multerUpload.single('file'),
  parseBody,
  validateRequest(
    DeliveryPartnerValidation.updateDeliveryPartnerDataValidationSchema
  ),
  DeliveryPartnerControllers.updateDeliveryPartner
);

// Get All Delivery Partners Route
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN'),
  DeliveryPartnerControllers.getAllDeliveryPartners
);

// Get Single Delivery Partner Route
router.get(
  '/:deliveryPartnerId',
  auth('ADMIN', 'SUPER_ADMIN'),
  DeliveryPartnerControllers.getSingleDeliveryPartner
);

export const DeliveryPartnerRoutes = router;
