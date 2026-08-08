import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { CheckoutServices } from './checkout.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { formatCheckoutResponse } from './checkout.utils';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// checkout Controller
const checkout = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await CheckoutServices.checkout(currentUser, req.body);

  const formattedData = formatCheckoutResponse(result?.data, req.lang);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created Checkout',
    target: `Checkout #${result?.data?._id}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
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
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

export const CheckoutController = {
  checkout,
  getCheckoutSummary,
};
