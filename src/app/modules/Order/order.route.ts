import express from 'express';
import auth from '../../middlewares/auth';
import { OrderControllers } from './order.controller';

const router = express.Router();

// Order add
router.post('/checkout', auth('CUSTOMER'), OrderControllers.createOrder);

// Get orders by vendor
router.get('/vendor', auth('VENDOR'), OrderControllers.getOrdersByVendor);

// Get all orders (admin)
router.get('/', auth('ADMIN', 'SUPER_ADMIN'), OrderControllers.getAllOrders);

// Get single order
router.get(
  '/:orderId',
  auth('CUSTOMER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN', 'DELIVERY_PARTNER'),
  OrderControllers.getSingleOrder
);

export const OrderRoutes = router;
