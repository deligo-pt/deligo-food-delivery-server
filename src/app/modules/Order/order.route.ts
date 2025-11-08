import express from 'express';
import auth from '../../middlewares/auth';
import { OrderControllers } from './order.controller';

const router = express.Router();

// Order add
router.post('/checkout', auth('CUSTOMER'), OrderControllers.createOrder);

// Get orders by vendor
router.get(
  '/vendor/orders',
  auth('VENDOR'),
  OrderControllers.getOrdersByVendor
);

// Get all orders (admin)
router.get('/', auth('ADMIN', 'SUPER_ADMIN'), OrderControllers.getAllOrders);

export const OrderRoutes = router;
