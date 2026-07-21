import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { IngredientOrderService } from './ing-order.service';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

const confirmIngredientOrder = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await IngredientOrderService.confirmIngredientOrder(
    req.body,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Confirmed Ingredient Order',
    target: `Ingredient Order #${req.body?.orderId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const getMyIngredientOrders = catchAsync(async (req, res) => {
  const result = await IngredientOrderService.getMyIngredientOrders(
    req.query,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: result?.data,
  });
});

const getAllIngredientOrdersForAdmin = catchAsync(async (req, res) => {
  const result = await IngredientOrderService.getAllIngredientOrdersForAdmin(
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: result?.data,
  });
});

const getSingleIngredientOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const result = await IngredientOrderService.getSingleIngredientOrder(orderId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

const updateIngredientOrderStatus = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const currentUser = req.user as TCurrentUser;

  const result = await IngredientOrderService.updateIngredientOrderStatus(
    orderId,
    status,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Ingredient Order Status',
    target: `Ingredient Order #${orderId}`,
    type: 'WARNING',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

export const IngredientOrderController = {
  confirmIngredientOrder,
  getMyIngredientOrders,
  getAllIngredientOrdersForAdmin,
  getSingleIngredientOrder,
  updateIngredientOrderStatus,
};
