import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { OrderServices } from './order.service';
import { AuthUser } from '../../constant/user.constant';
import { TImageFile } from '../../interfaces/image.interface';
import { InvoicePdService } from '../PdInvoice/downloadInvoice.service';

// create order after redUniq payment
const createOrderAfterRedUniqPayment = catchAsync(async (req, res) => {
  const result = await OrderServices.createOrderAfterRedUniqPayment(
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
    req.body,
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
  const file = req.file as TImageFile | undefined;
  const result = await OrderServices.updateOrderStatusByDeliveryPartner(
    req.params.orderId,
    req.user as AuthUser,
    file?.path ?? null,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
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
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery partner dispatch order fetched successfully',
    data: result,
  });
});

// get delivery partner current order
const getDeliveryPartnerCurrentOrder = catchAsync(async (req, res) => {
  const result = await OrderServices.getDeliveryPartnerCurrentOrder(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery partner current order fetched successfully',
    data: result,
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
