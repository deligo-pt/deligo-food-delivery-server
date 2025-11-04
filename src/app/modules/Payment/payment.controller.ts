import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentServices } from './payment.service';

// payment controller to handle payment routes

const processPaymentController = catchAsync(async (req, res) => {
  const { amount, currency, paymentMethodType, returnUrl } = req.body;

  const paymentIntent = await PaymentServices.processPayment(
    amount,
    currency,
    paymentMethodType,
    returnUrl
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment processed successfully',
    data: paymentIntent,
  });
});

export const PaymentController = {
  processPaymentController,
};
