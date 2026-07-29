import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { PaymentServices } from './payment.service';
import sendResponse from '../../utils/sendResponse';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// create redUniq payment intent controller
const createRedUniqPayment = catchAsync(async (req, res) => {
  const { checkoutSummaryId, paymentMethod, saveCard } = req.body;
  const currentUser = req.user as TCurrentUser;

  const result = await PaymentServices.createRedUniqPayment(
    checkoutSummaryId,
    paymentMethod,
    Boolean(saveCard),
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created Payment Intent',
    target: `Checkout Summary #${checkoutSummaryId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// pay with a previously saved card token (one-click checkout)
const payWithSavedToken = catchAsync(async (req, res) => {
  const { checkoutSummaryId, paymentTokenId } = req.body;
  const currentUser = req.user as TCurrentUser;

  const result = await PaymentServices.payWithSavedToken(
    checkoutSummaryId,
    paymentTokenId,
    currentUser,
    req.lang,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Paid With Saved Card',
    target: `Checkout Summary #${checkoutSummaryId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// REDUNIQ notification/webhook callback (no auth — gateway calls this directly)
const handleReduniqNotification = catchAsync(async (req, res) => {
  try {
    await PaymentServices.handleReduniqNotification(req.body);
  } catch (error) {
    console.error('REDUNIQ notification handling failed:', error);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: 'NOTIFICATION_RECEIVED' as TMessageKey,
    data: null,
  });
});

// handle payment failure controller
const handlePaymentFailure = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await PaymentServices.handlePaymentFailure(
    req.params.checkoutSummaryId,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Payment Failed',
    target: `Checkout Summary #${req.params.checkoutSummaryId}`,
    type: 'WARNING',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// refund redUniq payment controller
const refundRedUniqPayment = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await PaymentServices.refundRedUniqPayment(req.params.orderId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Refunded Payment',
    target: `Order #${req.params.orderId}`,
    type: 'WARNING',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// create ingredient redUniq payment intent controller
const createIngredientRedUniqPayment = catchAsync(async (req, res) => {
  const payload = req.body;
  const currentUser = req.user as TCurrentUser;

  const result = await PaymentServices.createIngredientRedUniqPayment(
    payload,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created Ingredient Payment Intent',
    target: `Vendor #${currentUser?.userId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

export const PaymentController = {
  createRedUniqPayment,
  payWithSavedToken,
  handleReduniqNotification,
  handlePaymentFailure,
  refundRedUniqPayment,
  createIngredientRedUniqPayment,
};
