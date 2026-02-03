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
  CartControllers.addToCart,
);

// activate item
router.patch(
  '/activate-item/:productId',
  auth('CUSTOMER'),
  CartControllers.activateItem,
);

// update cart item quantity
router.patch(
  '/update-quantity',
  auth('CUSTOMER'),
  validateRequest(CartValidation.updateCartItemQuantityValidationSchema),
  CartControllers.updateCartItemQuantity,
);

// update addon quantity
router.patch(
  '/update-addon-quantity',
  auth('CUSTOMER'),
  validateRequest(CartValidation.updateAddonQuantityValidationSchema),
  CartControllers.updateAddonQuantity,
);

// delete cart item
router.delete(
  '/delete-item',
  auth('CUSTOMER'),
  validateRequest(CartValidation.deleteCartItemValidationSchema),
  CartControllers.deleteCartItem,
);

// clear cart
router.delete('/clear-cart', auth('CUSTOMER'), CartControllers.clearCart);

// get all cart
router.get('/', auth('ADMIN', 'SUPER_ADMIN'), CartControllers.getAllCart);

// view cart
router.get(
  '/view-cart',
  auth('CUSTOMER', 'ADMIN', 'SUPER_ADMIN'),
  CartControllers.viewCart,
);

export const CartRoutes = router;
