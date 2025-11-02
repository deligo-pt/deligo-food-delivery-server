import express from 'express';
import auth from '../../middlewares/auth';
import { OrderControllers } from './order.controller';

const router = express.Router();

// Order add
router.post('/checkout', auth('CUSTOMER'), OrderControllers.createOrder);

export const OrderRoutes = router;
