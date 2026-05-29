import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TImageFile } from '../../interfaces/image.interface';
import { PayoutServices } from './payout.service';
import { TAuthUser } from '../AuthUser/authUser.interface';

// initiate payout controller
const initiateSettlement = catchAsync(async (req, res) => {
  const { targetUserId } = req.body;
  const result = await PayoutServices.initiateSettlement(
    targetUserId,
    req.user as TAuthUser,
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
    req.user as TAuthUser,
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
    req.user as TAuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Payouts fetched successfully',
    meta: result?.meta,
    data: result?.result,
  });
});

// get all payout controller
const getSinglePayout = catchAsync(async (req, res) => {
  const result = await PayoutServices.getSinglePayout(
    req.params.payoutId,
    req.user as TAuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Payout fetched successfully',
    data: result,
  });
});

export const PayoutController = {
  initiateSettlement,
  finalizeSettlement,
  getAllPayouts,
  getSinglePayout,
};
