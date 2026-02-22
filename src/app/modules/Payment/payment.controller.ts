import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { PaymentServices } from './payment.service';
import sendResponse from '../../utils/sendResponse';

// create stripe payment intent controller
const createPaymentIntent = catchAsync(async (req, res) => {
  const { checkoutSummaryId } = req.body;

  const session = await PaymentServices.createPaymentIntent(checkoutSummaryId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stripe payment session created',
    data: session,
  });
});

export const PaymentController = {
  createPaymentIntent,
};
