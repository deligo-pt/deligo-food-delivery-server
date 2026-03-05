import { Router } from 'express';
import auth from '../../middlewares/auth';
import { OrderControllers } from './order.controller';
import validateRequest from '../../middlewares/validateRequest';
import { OrderValidation } from './order.validation';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';

const router = Router();

// Create order after reduniq payment
router.post(
  '/create-order',
  auth('CUSTOMER'),
  OrderControllers.createOrderAfterReduniqPayment,
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
  multerUpload.single('file'),
  parseBody,
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

router.get(
  '/delivery-partner-dispatch-order',
  auth('DELIVERY_PARTNER'),
  OrderControllers.getDeliveryPartnersDispatchOrder,
);

// Get single order
router.get(
  '/:orderId',
  auth('CUSTOMER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN', 'DELIVERY_PARTNER'),
  OrderControllers.getSingleOrder,
);

// download invoice pdf from pasta digital
router.get(
  '/:orderId/download-invoice-pdf',
  auth('CUSTOMER', 'VENDOR', 'SUB_VENDOR', 'ADMIN', 'SUPER_ADMIN'),
  OrderControllers.downloadInvoicePdfFromPd,
);

// get delivery partner dispatch order
router.get(
  '/delivery-partner/dispatch-order',
  auth('DELIVERY_PARTNER'),
  OrderControllers.getDeliveryPartnersDispatchOrder,
);

// get delivery partner current order
router.get(
  '/delivery-partner/current-order',
  auth('DELIVERY_PARTNER'),
  OrderControllers.getDeliveryPartnerCurrentOrder,
);

export const OrderRoutes = router;
