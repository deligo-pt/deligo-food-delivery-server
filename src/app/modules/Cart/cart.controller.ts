import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CartServices } from './cart.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { formatCartResponse } from './cart.utils';

// Cart add Controller
const addToCart = catchAsync(async (req, res) => {
  const result = await CartServices.addToCart(
    req.body,
    req.user as TCurrentUser,
  );

  const formattedData = formatCartResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: formattedData,
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

  const formattedData = formatCartResponse(result?.data, req.lang);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: formattedData,
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
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

// update add on quantity Controller
const updateAddonQuantity = catchAsync(async (req, res) => {
  const result = await CartServices.updateAddonQuantity(
    req.user as TCurrentUser,
    req.body,
    req.lang,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
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
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

// clear cart Controller
const clearCart = catchAsync(async (req, res) => {
  const result = await CartServices.clearCart(req.user as TCurrentUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
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
    messageKey: result?.messageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

// view cart Controller
const viewCart = catchAsync(async (req, res) => {
  const { cartCustomerId } = req.body;
  const result = await CartServices.viewCart(
    req.user as TCurrentUser,
    cartCustomerId,
  );

  const formattedData = formatCartResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: formattedData,
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
