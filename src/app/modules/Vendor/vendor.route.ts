import express from 'express';
import auth from '../../middlewares/auth';
import { VendorControllers } from './vendor.controller';
import validateRequest from '../../middlewares/validateRequest';
import { VendorValidation } from './vendor.validation';
import { multerUpload } from '../../config/multer.config';

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
  VendorControllers.vendorDocImageUpload
);

// submit vendor for approval Route
router.patch(
  '/:id/submitForApproval',
  auth('VENDOR', 'SUPER_ADMIN', 'ADMIN'),
  VendorControllers.submitVendorForApproval
);

// approve or reject vendor Route
router.patch(
  '/:id/approveOrReject',
  auth('SUPER_ADMIN', 'ADMIN'),
  validateRequest(VendorValidation.approveOrRejectVendorValidationSchema),
  VendorControllers.approveOrRejectVendor
);

// vendor delete Route
router.delete(
  '/:id',
  auth('VENDOR', 'SUPER_ADMIN'),
  VendorControllers.vendorDelete
);

router.get('/', auth('ADMIN', 'SUPER_ADMIN'), VendorControllers.getAllVendors);
router.get(
  '/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  VendorControllers.getSingleVendor
);

export const VendorRoutes = router;
