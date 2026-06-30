import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { OrderServices } from './order.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { InvoicePdService } from '../PdInvoice/downloadInvoice.service';
import { TMessageKey } from '../../errors/messages';
import { formatOrderResponse } from './order.utils';

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

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single order controller
const getSingleOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.getSingleOrder(
    req.params.orderId,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// update order status by vendor controller (accept/reject/preparing/cancel)
const updateOrderStatusByVendor = catchAsync(async (req, res) => {
  const result = await OrderServices.updateOrderStatusByVendor(
    req.user as TCurrentUser,
    req.params.orderId,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// broadcast order controller
const broadcastOrderToPartners = catchAsync(async (req, res) => {
  const result = await OrderServices.broadcastOrderToPartners(
    req.params.orderId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// assign delivery partner to order controller
const partnerAcceptsDispatchedOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.partnerAcceptsDispatchedOrder(
    req.user as TCurrentUser,
    req.params.orderId,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// update order status by delivery partner controller
const updateOrderStatusByDeliveryPartner = catchAsync(async (req, res) => {
  const result = await OrderServices.updateOrderStatusByDeliveryPartner(
    req.params.orderId,
    req.user as TCurrentUser,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// download invoice pdf from pasta digital controller
const downloadInvoicePdfFromPd = catchAsync(async (req, res) => {
  const base64Data = await InvoicePdService.downloadOrderInvoicePdf(
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
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// get delivery partner current order
const getDeliveryPartnerCurrentOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.getDeliveryPartnerCurrentOrder(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

export const OrderControllers = {
  createOrderAfterRedUniqPayment,
  getAllOrders,
  getSingleOrder,
  updateOrderStatusByVendor,
  broadcastOrderToPartners,
  partnerAcceptsDispatchedOrder,
  updateOrderStatusByDeliveryPartner,
  downloadInvoicePdfFromPd,
  getDeliveryPartnersDispatchOrder,
  getDeliveryPartnerCurrentOrder,
};
