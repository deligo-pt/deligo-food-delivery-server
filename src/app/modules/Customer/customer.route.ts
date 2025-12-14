import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { CustomerControllers } from './customer.controller';
import { CustomerValidation } from './customer.validation';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';

const router = Router();

// User Update Route
router.patch(
  '/:customerId',
  auth('ADMIN', 'SUPER_ADMIN', 'CUSTOMER'),
  multerUpload.single('file'),
  parseBody,
  validateRequest(CustomerValidation.updateCustomerDataValidationSchema),
  CustomerControllers.updateCustomer
);

// add delivery address
router.post(
  '/add-delivery-address',
  auth('CUSTOMER'),
  validateRequest(CustomerValidation.addDeliveryAddressValidationSchema),
  CustomerControllers.addDeliveryAddress
);

// toggle delivery address status
router.patch(
  '/toggle-delivery-address-status/:addressId',
  auth('CUSTOMER'),
  CustomerControllers.toggleDeliveryAddressStatus
);

// Delete delivery address
router.delete(
  '/:addressId',
  auth('CUSTOMER'),
  CustomerControllers.deleteDeliveryAddress
);

// Get all customers
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN'),
  CustomerControllers.getAllCustomers
);
// Get single customer
router.get(
  '/:customerId',
  auth('ADMIN', 'SUPER_ADMIN', 'DELIVERY_PARTNER', 'FLEET_MANAGER', 'VENDOR'),
  CustomerControllers.getSingleCustomer
);

export const CustomerRoutes = router;
