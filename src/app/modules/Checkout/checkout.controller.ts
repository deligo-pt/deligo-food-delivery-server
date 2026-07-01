import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { CheckoutServices } from './checkout.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { formatCheckoutResponse } from './checkout.utils';

// checkout Controller
const checkout = catchAsync(async (req, res) => {
  const result = await CheckoutServices.checkout(
    req.user as TCurrentUser,
    req.body,
  );

  const formattedData = formatCheckoutResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: formattedData,
  });
});

// get checkout summary Controller
const getCheckoutSummary = catchAsync(async (req, res) => {
  const { checkoutSummaryId } = req.params;
  const result = await CheckoutServices.getCheckoutSummary(
    checkoutSummaryId,
    req.user as TCurrentUser,
  );

  const formattedData = formatCheckoutResponse(result?.data, req.lang);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: formattedData,
  });
});

export const CheckoutController = {
  checkout,
  getCheckoutSummary,
};
