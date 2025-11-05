import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { CustomerControllers } from './customer.controller';
import { CustomerValidation } from './customer.validation';

const router = Router();

// User Update Route
router.patch(
  '/:id',
  auth('ADMIN', 'SUPER_ADMIN', 'CUSTOMER'),
  validateRequest(CustomerValidation.updateCustomerDataValidationSchema),
  CustomerControllers.updateCustomer
);

router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN'),
  CustomerControllers.getAllCustomers
);
router.get(
  '/:customerId',
  auth('ADMIN', 'SUPER_ADMIN', 'DELIVERY_PARTNER', 'FLEET_MANAGER', 'VENDOR'),
  CustomerControllers.getSingleCustomer
);

export const CustomerRoutes = router;
