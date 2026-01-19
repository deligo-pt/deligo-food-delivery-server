import { Router } from 'express';
import auth from '../../middlewares/auth';
import { TaxController } from './tax.controller';
import validateRequest from '../../middlewares/validateRequest';
import { TaxValidations } from './tax.validation';

const router = Router();

// create tax route
router.post(
  '/create-tax',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(TaxValidations.createTaxValidationSchema),
  TaxController.createTax,
);

// update tax route
router.patch(
  '/:taxId',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(TaxValidations.updateTaxValidationSchema),
  TaxController.updateTax,
);

// get all taxes route
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  TaxController.getAllTaxes,
);

// get single tax route
router.get(
  '/:taxId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  TaxController.getSingleTax,
);

// soft delete tax route
router.delete(
  '/soft-delete/:taxId',
  auth('ADMIN', 'SUPER_ADMIN'),
  TaxController.softDeleteTax,
);

export const TaxRoutes = router;
