import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { OrderServices } from './order.service';
import { AuthUser } from '../../constant/user.constant';

// order after payment secure controller
const createOrderAfterPayment = catchAsync(async (req, res) => {
  const result = await OrderServices.createOrderAfterPayment(
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Order created successfully',
    data: result,
  });
});

// order by vendor controller
const getOrdersByVendor = catchAsync(async (req, res) => {
  const result = await OrderServices.getOrdersByVendor(
    req.user?.id as string,
    req.query
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Orders retrieved successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// get all orders
const getAllOrders = catchAsync(async (req, res) => {
  const result = await OrderServices.getAllOrders(
    req.query,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Orders retrieved successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// get single order controller
const getSingleOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.getSingleOrder(
    req.params.orderId,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Order retrieved successfully',
    data: result,
  });
});

// accept or reject order by vendor controller
const acceptOrRejectOrderByVendor = catchAsync(async (req, res) => {
  const result = await OrderServices.acceptOrRejectOrderByVendor(
    req.user as AuthUser,
    req.params.orderId,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Order ${req.body.type.toLowerCase()} successfully`,
    data: result,
  });
});

// assign delivery partner to order controller
const assignDeliveryPartner = catchAsync(async (req, res) => {
  const result = await OrderServices.assignDeliveryPartner(
    req.user as AuthUser,
    req.params.orderId
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery partner assigned successfully',
    data: result,
  });
});

export const OrderControllers = {
  createOrderAfterPayment,
  getOrdersByVendor,
  getAllOrders,
  getSingleOrder,
  acceptOrRejectOrderByVendor,
  assignDeliveryPartner,
};
