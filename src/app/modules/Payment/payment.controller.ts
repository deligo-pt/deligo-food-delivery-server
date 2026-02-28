import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { PaymentServices } from './payment.service';
import sendResponse from '../../utils/sendResponse';
import { AuthUser } from '../../constant/user.constant';

// create reduniq payment intent controller
const createReduniqPayment = catchAsync(async (req, res) => {
  const { checkoutSummaryId, paymentMethod } = req.body;

  const session = await PaymentServices.createReduniqPayment(
    checkoutSummaryId,
    paymentMethod,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reduniq payment session created',
    data: session,
  });
});

// handle payment failure controller
const handlePaymentFailure = catchAsync(async (req, res) => {
  const result = await PaymentServices.handlePaymentFailure(
    req.params.checkoutSummaryId,
    req.user as AuthUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

export const PaymentController = {
  createReduniqPayment,
  handlePaymentFailure,
};
