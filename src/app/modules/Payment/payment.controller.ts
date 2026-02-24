import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { PaymentServices } from './payment.service';
import sendResponse from '../../utils/sendResponse';

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

export const PaymentController = {
  createReduniqPayment,
};
