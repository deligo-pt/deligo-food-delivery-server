import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { LoginHistoryServices } from './loginHistory.service';

const getAllLoginHistory = catchAsync(async (req, res) => {
  const result = await LoginHistoryServices.getAllLoginHistory(
    req.query,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: result?.data,
  });
});

const getSingleLoginHistory = catchAsync(async (req, res) => {
  const result = await LoginHistoryServices.getSingleLoginHistory(
    req.params.id,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

export const LoginHistoryControllers = {
  getAllLoginHistory,
  getSingleLoginHistory,
};
