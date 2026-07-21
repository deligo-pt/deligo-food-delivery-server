import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { PaymentServices } from './payment.service';
import sendResponse from '../../utils/sendResponse';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// create redUniq payment intent controller
const createRedUniqPayment = catchAsync(async (req, res) => {
  const { checkoutSummaryId, paymentMethod } = req.body;
  const currentUser = req.user as TCurrentUser;

  const result = await PaymentServices.createRedUniqPayment(
    checkoutSummaryId,
    paymentMethod,
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
  handlePaymentFailure,
  createIngredientRedUniqPayment,
};
