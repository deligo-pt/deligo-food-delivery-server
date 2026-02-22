import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { OrderServices } from './order.service';
import { AuthUser } from '../../constant/user.constant';

// order after payment secure controller
const createOrderAfterPayment = catchAsync(async (req, res) => {
  const result = await OrderServices.createOrderAfterPayment(
    req.body,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Order created successfully',
    data: result,
  });
});

// get all orders
const getAllOrders = catchAsync(async (req, res) => {
  const result = await OrderServices.getAllOrders(
    req.query,
    req.user as AuthUser,
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
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Order retrieved successfully',
    data: result,
  });
});

// update order status by vendor controller (accept/reject/preparing/cancel)
const updateOrderStatusByVendor = catchAsync(async (req, res) => {
  const result = await OrderServices.updateOrderStatusByVendor(
    req.user as AuthUser,
    req.params.orderId,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Order ${req.body.type.toLowerCase()} successfully`,
    data: result,
  });
});

// broadcast order controller
const broadcastOrderToPartners = catchAsync(async (req, res) => {
  const result = await OrderServices.broadcastOrderToPartners(
    req.params.orderId,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// assign delivery partner to order controller
const partnerAcceptsDispatchedOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.partnerAcceptsDispatchedOrder(
    req.user as AuthUser,
    req.params.orderId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// otp verification by vendor controller
const otpVerificationByVendor = catchAsync(async (req, res) => {
  const result = await OrderServices.otpVerificationByVendor(
    req.params.orderId,
    req.body.otp,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// update order status by delivery partner controller
const updateOrderStatusByDeliveryPartner = catchAsync(async (req, res) => {
  const result = await OrderServices.updateOrderStatusByDeliveryPartner(
    req.params.orderId,
    req.body,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Order status updated successfully',
    data: result,
  });
});

export const OrderControllers = {
  createOrderAfterPayment,
  getAllOrders,
  getSingleOrder,
  updateOrderStatusByVendor,
  broadcastOrderToPartners,
  partnerAcceptsDispatchedOrder,
  otpVerificationByVendor,
  updateOrderStatusByDeliveryPartner,
};
