import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { CheckoutServices } from './checkout.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

// checkout Controller
const checkout = catchAsync(async (req, res) => {
  const result = await CheckoutServices.checkout(
    req.user as TCurrentUser,
    req.body,
    req.lang,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Checkout successfully',
    data: result,
  });
});

// get checkout summary Controller
const getCheckoutSummary = catchAsync(async (req, res) => {
  const { checkoutSummaryId } = req.params;
  const result = await CheckoutServices.getCheckoutSummary(
    checkoutSummaryId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Checkout summary retrieved successfully',
    data: result,
  });
});

export const CheckoutController = {
  checkout,
  getCheckoutSummary,
};
