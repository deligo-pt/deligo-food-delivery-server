import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { PaymentServices } from './payment.service';
import sendResponse from '../../utils/sendResponse';

const createPaymentSessionController = catchAsync(async (req, res) => {
  const { checkoutSummaryId } = req.body;

  const session = await PaymentServices.createPaymentSession(checkoutSummaryId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stripe payment session created',
    data: session,
  });
});

export const PaymentController = {
  createPaymentSessionController,
};
