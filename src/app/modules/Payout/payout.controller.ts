import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthUser } from '../../constant/user.constant';
import { TImageFile } from '../../interfaces/image.interface';
import { PayoutServices } from './payout.service';

// initiate payout controller
const initiateSettlement = catchAsync(async (req, res) => {
  const { targetUserId } = req.body;
  const result = await PayoutServices.initiateSettlement(
    targetUserId,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Settlement initiated successfully',
    data: result,
  });
});

// finalize payout controller
const finalizeSettlement = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const result = await PayoutServices.finalizeSettlement(
    req.params.payoutId,
    req.body,
    file?.path ?? null,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

export const PayoutController = {
  initiateSettlement,
  finalizeSettlement,
};
