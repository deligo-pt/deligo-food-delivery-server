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
  OrderControllers.createOrderAfterPayment,
);

// Accept / Reject / Preparing / Ready for pickup/ Cancel order
router.patch(
  '/:orderId/status',
  auth('VENDOR', 'SUB_VENDOR'),
  validateRequest(OrderValidation.updateOrderStatusByVendorValidationSchema),
  OrderControllers.updateOrderStatusByVendor,
);

// Assign delivery partner to order (vendor)
router.patch(
  '/:orderId/broadcast-order',
  auth('VENDOR', 'SUB_VENDOR'),
  OrderControllers.broadcastOrderToPartners,
);

// Delivery partner accepts dispatched order
router.patch(
  '/:orderId/accept-dispatch-order',
  auth('DELIVERY_PARTNER'),
  validateRequest(OrderValidation.partnerAcceptDispatchOrder),
  OrderControllers.partnerAcceptsDispatchedOrder,
);

// verify otp by vendor
router.patch(
  '/:orderId/verify-otp',
  auth('VENDOR'),
  OrderControllers.otpVerificationByVendor,
);

// update order status by delivery partner
router.patch(
  '/:orderId/update-order-status',
  auth('DELIVERY_PARTNER'),
  validateRequest(
    OrderValidation.updateOrderStatusByDeliveryPartnerValidationSchema,
  ),
  OrderControllers.updateOrderStatusByDeliveryPartner,
);

// Get all orders
router.get(
  '/',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'DELIVERY_PARTNER',
    'VENDOR',
    'SUB_VENDOR',
    'FLEET_MANAGER',
    'CUSTOMER',
  ),
  OrderControllers.getAllOrders,
);

// Get single order
router.get(
  '/:orderId',
  auth('CUSTOMER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN', 'DELIVERY_PARTNER'),
  OrderControllers.getSingleOrder,
);

export const OrderRoutes = router;
