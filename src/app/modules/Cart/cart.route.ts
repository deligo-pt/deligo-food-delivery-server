import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CartValidation } from './cart.validation';
import { CartControllers } from './cart.controller';

const router = Router();

// Cart add
router.post(
  '/add-to-cart',
  auth('CUSTOMER'),
  validateRequest(CartValidation.addToCartValidationSchema),
  CartControllers.addToCart
);

// activate item
router.patch(
  '/activate-item/:productId',
  auth('CUSTOMER'),
  CartControllers.activateItem
);

// view cart
router.get('/view-cart', auth('CUSTOMER'), CartControllers.viewCart);

export const CartRoutes = router;
