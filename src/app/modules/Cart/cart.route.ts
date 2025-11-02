import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CartValidation } from './cart.validation';
import { CartControllers } from './cart.controller';

const router = express.Router();

// Cart add
router.post(
  '/add-to-cart',
  auth('CUSTOMER'),
  validateRequest(CartValidation.addToCartValidationSchema),
  CartControllers.addToCart
);

// view cart
router.get('/view-cart', auth('CUSTOMER'), CartControllers.viewCart);

// view all carts
router.get('/', auth('ADMIN', 'SUPER_ADMIN'), CartControllers.viewAllCarts);

export const CartRoutes = router;
