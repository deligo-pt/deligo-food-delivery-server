import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { OrderServices } from './order.service';
import { AuthUser } from '../../constant/user.const';

// Order Controller
const createOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.createOrder(
    req.user as AuthUser,
    req.body
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
    data: result,
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
    data: result,
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

export const OrderControllers = {
  createOrder,
  getOrdersByVendor,
  getAllOrders,
  getSingleOrder,
};
