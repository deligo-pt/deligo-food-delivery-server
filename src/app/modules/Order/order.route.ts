import { Router } from 'express';
import auth from '../../middlewares/auth';
import { OrderControllers } from './order.controller';
import validateRequest from '../../middlewares/validateRequest';
import { OrderValidation } from './order.validation';

const router = Router();

// Order add
router.post('/checkout', auth('CUSTOMER'), OrderControllers.createOrder);

// Get orders by vendor
router.get('/vendor', auth('VENDOR'), OrderControllers.getOrdersByVendor);

// Get all orders (admin)
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'DELIVERY_PARTNER'),
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
  auth('VENDOR'),
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
