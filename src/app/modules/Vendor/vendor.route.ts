import express from 'express';
import auth from '../../middlewares/auth';
import { VendorControllers } from './vendor.controller';
import validateRequest from '../../middlewares/validateRequest';
import { VendorValidation } from './vendor.validation';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';

const router = express.Router();

// Vendor update Route
router.patch(
  '/:id',
  auth('VENDOR', 'SUPER_ADMIN', 'ADMIN'),
  validateRequest(VendorValidation.vendorUpdateValidationSchema),
  VendorControllers.vendorUpdate
);

// vendor doc image upload route
router.patch(
  '/:id/docImage',
  auth('VENDOR', 'SUPER_ADMIN'),
  multerUpload.single('file'),
  parseBody,
  VendorControllers.vendorDocImageUpload
);
// get all vendors
router.get('/', auth('ADMIN', 'SUPER_ADMIN'), VendorControllers.getAllVendors);
// get single vendor
router.get(
  '/:vendorId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR'),
  VendorControllers.getSingleVendor
);

export const VendorRoutes = router;
