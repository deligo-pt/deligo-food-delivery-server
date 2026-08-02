/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { OrderServices } from './order.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { formatOrderResponse } from './order.utils';
import { InvoiceService } from '../Invoice/invoice.service';
import { formatCartResponse } from '../Cart/cart.utils';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// create order after redUniq payment
const createOrderAfterRedUniqPayment = catchAsync(async (req, res) => {
  const result = await OrderServices.createOrderAfterRedUniqPayment(
    req.body,
    req.user as TCurrentUser,
    req.lang,
  );

  const formattedData = formatOrderResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});

// get all orders
const getAllOrders = catchAsync(async (req, res) => {
  const result = await OrderServices.getAllOrders(
    req.query,
    req.user as TCurrentUser,
  );

  const formattedData = result?.data?.map((order) =>
    formatOrderResponse(order, req.lang),
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: formattedData,
  });
});

// get single order controller
const getSingleOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.getSingleOrder(
    req.params.orderId,
    req.user as TCurrentUser,
  );

  const formattedData = formatOrderResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});

// update order status by vendor controller (accept/reject/preparing/cancel)
const updateOrderStatusByVendor = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const orderId = req.params.orderId;
  const result = await OrderServices.updateOrderStatusByVendor(
    currentUser,
    orderId,
    req.body,
  );

  const statusType = req.body?.type;
  const activityType =
    statusType === 'REJECTED'
      ? 'DANGER'
      : statusType === 'CANCELED'
        ? 'WARNING'
        : 'INFO';

  createActivityLog({
    customUserId: currentUser?.userId,
    action: `Updated Order Status to ${statusType}`,
    target: `Order #${orderId}`,
    type: activityType,
  });

  const formattedData = formatOrderResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

// cancel order by customer controller
const cancelOrderByCustomer = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const orderId = req.params.orderId;
  const { reason } = req.body;

  const result = await OrderServices.cancelOrderByCustomer(
    currentUser,
    orderId,
    reason,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Canceled Order',
    target: `Order #${orderId}`,
    type: 'WARNING',
  });

  const formattedData = formatOrderResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});

// broadcast order controller
const broadcastOrderToPartners = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const orderId = req.params.orderId;
  const result = await OrderServices.broadcastOrderToPartners(
    orderId,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Broadcasted Order to Delivery Partners',
    target: `Order #${orderId}`,
    type: 'INFO',
  });

  const formattedData = formatOrderResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

// assign delivery partner to order controller
const partnerAcceptsDispatchedOrder = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const orderId = req.params.orderId;
  const result = await OrderServices.partnerAcceptsDispatchedOrder(
    currentUser,
    orderId,
    req.body,
  );

  const action = req.body?.action;

  createActivityLog({
    customUserId: currentUser?.userId,
    action:
      action === 'REJECT'
        ? 'Rejected Dispatched Order'
        : 'Accepted Dispatched Order',
    target: `Order #${orderId}`,
    type: action === 'REJECT' ? 'DANGER' : 'INFO',
  });

  const formattedData = formatOrderResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});

// update order status by delivery partner controller
const updateOrderStatusByDeliveryPartner = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const orderId = req.params.orderId;
  const result = await OrderServices.updateOrderStatusByDeliveryPartner(
    orderId,
    currentUser,
    req.body,
  );

  const orderStatus = req.body?.orderStatus;

  createActivityLog({
    customUserId: currentUser?.userId,
    action: `Updated Order Status to ${orderStatus}`,
    target: `Order #${orderId}`,
    type: orderStatus === 'REASSIGNMENT_NEEDED' ? 'WARNING' : 'INFO',
  });

  const formattedData = formatOrderResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});

// download invoice pdf from pasta digital controller
const downloadInvoicePdfFromPd = catchAsync(async (req, res) => {
  const base64Data = await InvoiceService.downloadOrderInvoicePdf(
    req.params.orderId,
  );

  const pdfBuffer = Buffer.from(base64Data, 'base64');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename=invoice-${req.params.orderId}.pdf`,
  );

  res.status(httpStatus.OK).send(pdfBuffer);
});

// get delivery partner dispatch order
const getDeliveryPartnersDispatchOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.getDeliveryPartnersDispatchOrder(
    req.user as TCurrentUser,
  );

  const formattedData = result?.data?.map((order) =>
    formatOrderResponse(order, req.lang),
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});

// get delivery partner current order
const getDeliveryPartnerCurrentOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.getDeliveryPartnerCurrentOrder(
    req.user as TCurrentUser,
  );

  const formattedData = formatOrderResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});

const reorderOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.reorderOrder(
    req.params.orderId,
    req.user as TCurrentUser,
    req.lang,
  );

  const formattedData = formatCartResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});

export const OrderControllers = {
  createOrderAfterRedUniqPayment,
  getAllOrders,
  getSingleOrder,
  updateOrderStatusByVendor,
  cancelOrderByCustomer,
  broadcastOrderToPartners,
  partnerAcceptsDispatchedOrder,
  updateOrderStatusByDeliveryPartner,
  downloadInvoicePdfFromPd,
  getDeliveryPartnersDispatchOrder,
  getDeliveryPartnerCurrentOrder,
  reorderOrder,
};
