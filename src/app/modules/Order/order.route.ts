import { Router } from 'express';
import auth from '../../middlewares/auth';
import { OrderControllers } from './order.controller';
import validateRequest from '../../middlewares/validateRequest';
import { OrderValidation } from './order.validation';

const router = Router();

// Create order
router.post(
  '/create-order',
  auth('CUSTOMER'),
  OrderControllers.createOrderAfterPayment
);

// Get all orders
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'DELIVERY_PARTNER', 'VENDOR', 'CUSTOMER'),
  OrderControllers.getAllOrders
);

// Get single order
router.get(
  '/:orderId',
  auth('CUSTOMER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN', 'DELIVERY_PARTNER'),
  OrderControllers.getSingleOrder
);

// Accept or Reject order by vendor
router.patch(
  '/:orderId/accept-reject',
  auth('VENDOR', 'ADMIN', 'SUPER_ADMIN'),
  validateRequest(OrderValidation.acceptOrRejectOrderValidationSchema),
  OrderControllers.acceptOrRejectOrderByVendor
);

// Assign delivery partner to order (delivery partner)
router.patch(
  '/:orderId/assign-delivery-partner',
  auth('DELIVERY_PARTNER'),
  OrderControllers.assignDeliveryPartner
);

export const OrderRoutes = router;
