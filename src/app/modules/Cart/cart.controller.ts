import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CartServices } from './cart.service';
import { AuthUser } from '../../constant/user.constant';

// Cart add Controller
const addToCart = catchAsync(async (req, res) => {
  const result = await CartServices.addToCart(req.body, req.user as AuthUser);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product added to cart successfully',
    data: result,
  });
});

// activate item Controller
const activateItem = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await CartServices.activateItem(
    req.user as AuthUser,
    productId,
    req.body.variantName
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Item activated successfully',
    data: result,
  });
});

// update cart item Controller
const updateCartItemQuantity = catchAsync(async (req, res) => {
  const result = await CartServices.updateCartItemQuantity(
    req.user as AuthUser,
    req.body
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product quantity updated successfully',
    data: result,
  });
});

// delete cart item Controller
const deleteCartItem = catchAsync(async (req, res) => {
  const itemsToDelete = Array.isArray(req.body) ? req.body : [req.body];

  const result = await CartServices.deleteCartItem(
    req.user as AuthUser,
    itemsToDelete
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Cart updated: Item(s) removed successfully',
    data: result,
  });
});

// update cart items add ons
const updateCartItemAddons = catchAsync(async (req, res) => {
  const result = await CartServices.updateCartItemAddons(
    req.user as AuthUser,
    req.body
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product addons updated successfully',
    data: result,
  });
});

// view cart Controller
const viewCart = catchAsync(async (req, res) => {
  const result = await CartServices.viewCart(req.user as AuthUser);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Cart retrieved successfully',
    data: result,
  });
});

export const CartControllers = {
  addToCart,
  activateItem,
  updateCartItemQuantity,
  deleteCartItem,
  updateCartItemAddons,
  viewCart,
};
