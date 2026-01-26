import { Router } from 'express';
import auth from '../../middlewares/auth';
import { VendorControllers } from './vendor.controller';
import validateRequest from '../../middlewares/validateRequest';
import { VendorValidation } from './vendor.validation';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';
import { GlobalValidation } from '../../constant/GlobalValidation/global.validation';

const router = Router();

// Vendor update Route
router.patch(
  '/:vendorId',
  auth('VENDOR', 'SUPER_ADMIN', 'ADMIN'),
  validateRequest(VendorValidation.vendorUpdateValidationSchema),
  VendorControllers.vendorUpdate,
);

// Vendor doc image upload route
router.patch(
  '/:vendorId/docImage',
  auth('VENDOR', 'SUPER_ADMIN', 'ADMIN'),
  multerUpload.single('file'),
  parseBody,
  validateRequest(VendorValidation.vendorDocImageValidationSchema),
  VendorControllers.vendorDocImageUpload,
);

// Vendor business location update route
router.patch(
  '/:vendorId/liveLocation',
  auth('VENDOR', 'SUB_VENDOR'),
  validateRequest(GlobalValidation.UpdateLiveLocationValidationSchema),
  VendorControllers.updateVendorLiveLocation,
);

// Vendor toggle store open close route
router.patch(
  '/toggle/store-open-close',
  auth('VENDOR'),
  VendorControllers.toggleVendorStoreOpenClose,
);

// get all vendors
router.get('/', auth('ADMIN', 'SUPER_ADMIN'), VendorControllers.getAllVendors);
// get single vendor
router.get(
  '/:vendorId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR'),
  VendorControllers.getSingleVendor,
);

export const VendorRoutes = router;
