import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { PaymentServices } from './payment.service';
import sendResponse from '../../utils/sendResponse';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

// create redUniq payment intent controller
const createRedUniqPayment = catchAsync(async (req, res) => {
  const { checkoutSummaryId, paymentMethod } = req.body;

  const session = await PaymentServices.createRedUniqPayment(
    checkoutSummaryId,
    paymentMethod,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'RedUniq payment session created',
    data: session,
  });
});

// handle payment failure controller
const handlePaymentFailure = catchAsync(async (req, res) => {
  const result = await PaymentServices.handlePaymentFailure(
    req.params.checkoutSummaryId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

// create ingredient redUniq payment intent controller
const createIngredientRedUniqPayment = catchAsync(async (req, res) => {
  const payload = req.body;
  const currentUser = req.user as TCurrentUser;

  const session = await PaymentServices.createIngredientRedUniqPayment(
    payload,
    currentUser,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Ingredient redUniq payment session created',
    data: session,
  });
});

export const PaymentController = {
  createRedUniqPayment,
  handlePaymentFailure,
  createIngredientRedUniqPayment,
};
