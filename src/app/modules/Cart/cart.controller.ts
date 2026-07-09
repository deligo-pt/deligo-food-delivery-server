import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CartServices } from './cart.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { formatCartResponse } from './cart.utils';
import { TMessageKey } from '../../errors/messages';
import config from '../../config';

const node_env = config.NODE_ENV;

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
    messageKey: result?.messageKey as TMessageKey,
    data: node_env === 'development' ? 'undefined' : formattedData,
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
    messageKey: result?.messageKey as TMessageKey,
    data: node_env === 'development' ? formattedData : undefined,
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
    messageKey: result?.messageKey as TMessageKey,
    data: node_env === 'development' ? result?.data : undefined,
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
    messageKey: result?.messageKey as TMessageKey,
    data: node_env === 'production' ? undefined : result?.data,
  });
});

// clear cart Controller
const clearCart = catchAsync(async (req, res) => {
  const result = await CartServices.clearCart(req.user as TCurrentUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: node_env === 'development' ? result?.data : undefined,
  });
});

// get all cart Controller
const getAllCart = catchAsync(async (req, res) => {
  const result = await CartServices.getAllCart(
    req.user as TCurrentUser,
    req.query,
    req.lang,
  );

  const formattedData = result?.data.map((item) => {
    return formatCartResponse(item, req.lang);
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: formattedData,
  });
});

// view cart Controller
const viewCart = catchAsync(async (req, res) => {
  const { cartCustomerId } = req.body;
  const result = await CartServices.viewCart(
    req.user as TCurrentUser,
    cartCustomerId,
    req.lang,
  );

  const formattedData = formatCartResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

export const CartControllers = {
  addToCart,
  toggleCartItemStatus,
  updateAddonQuantity,
  deleteCartItem,
  clearCart,
  getAllCart,
  viewCart,
};
