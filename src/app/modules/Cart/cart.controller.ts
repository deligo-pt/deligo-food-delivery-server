import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CartServices } from './cart.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

// Cart add Controller
const addToCart = catchAsync(async (req, res) => {
  const result = await CartServices.addToCart(
    req.body,
    req.user as TCurrentUser,
    req.lang,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product added to cart successfully',
    data: result,
  });
});

// toggle cart item status Controller
const toggleCartItemStatus = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await CartServices.toggleCartItemStatus(
    req.user as TCurrentUser,
    productId,
    req.lang,
    req.body.variationSku,
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
    req.user as TCurrentUser,
    req.body,
    req.lang,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product quantity updated successfully',
    data: result,
  });
});

// update add on quantity Controller
const updateAddonQuantity = catchAsync(async (req, res) => {
  const result = await CartServices.updateAddonQuantity(
    req.user as TCurrentUser,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product addon quantity updated successfully',
    data: result,
  });
});

// delete cart item Controller
const deleteCartItem = catchAsync(async (req, res) => {
  const itemsToDelete = Array.isArray(req.body) ? req.body : [req.body];

  const result = await CartServices.deleteCartItem(
    req.user as TCurrentUser,
    itemsToDelete,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Cart updated: Item(s) removed successfully',
    data: result,
  });
});

// clear cart Controller
const clearCart = catchAsync(async (req, res) => {
  const result = await CartServices.clearCart(req.user as TCurrentUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Cart cleared successfully',
    data: result,
  });
});

// get all cart Controller
const getAllCart = catchAsync(async (req, res) => {
  const result = await CartServices.getAllCart(
    req.user as TCurrentUser,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Cart retrieved successfully',
    data: result,
  });
});

// view cart Controller
const viewCart = catchAsync(async (req, res) => {
  const { cartCustomerId } = req.body;
  const result = await CartServices.viewCart(
    req.user as TCurrentUser,
    cartCustomerId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Cart retrieved successfully',
    data: result,
  });
});

export const CartControllers = {
  addToCart,
  toggleCartItemStatus,
  updateCartItemQuantity,
  updateAddonQuantity,
  deleteCartItem,
  clearCart,
  getAllCart,
  viewCart,
};
