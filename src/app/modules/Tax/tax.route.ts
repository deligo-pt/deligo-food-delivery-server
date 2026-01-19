import { Router } from 'express';
import auth from '../../middlewares/auth';
import { TaxController } from './tax.controller';
import validateRequest from '../../middlewares/validateRequest';
import { TaxValidations } from './tax.validation';

const router = Router();

router.post(
  '/create-tax',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(TaxValidations.createTaxValidationSchema),
  TaxController.createTax,
);

export const TaxRoutes = router;
