import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { AuthUser } from '../../constant/user.constant';
import { CheckoutServices } from './checkout.service';

// checkout Controller
const checkout = catchAsync(async (req, res) => {
  const result = await CheckoutServices.checkout(
    req.user as AuthUser,
    req.body
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
    req.user as AuthUser
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
