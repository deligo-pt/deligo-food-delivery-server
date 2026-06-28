import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TImageFile } from '../../interfaces/image.interface';
import { PayoutServices } from './payout.service';

// initiate payout controller
const initiateSettlement = catchAsync(async (req, res) => {
  const { targetUserId } = req.body;
  const result = await PayoutServices.initiateSettlement(
    targetUserId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// finalize payout controller
const finalizeSettlement = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const result = await PayoutServices.finalizeSettlement(
    req.params.payoutId,
    req.body,
    file?.path ?? null,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// get all payout controller
const getAllPayouts = catchAsync(async (req, res) => {
  const result = await PayoutServices.getAllPayouts(
    req.query,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    meta: result?.meta,
    data: result?.data,
  });
});

// get all payout controller
const getSinglePayout = catchAsync(async (req, res) => {
  const result = await PayoutServices.getSinglePayout(
    req.params.payoutId,
    req.user as TCurrentUser,
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
  getAllPayouts,
  getSinglePayout,
};
