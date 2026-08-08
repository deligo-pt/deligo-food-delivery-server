import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TImageFile } from '../../interfaces/image.interface';
import { PayoutServices } from './payout.service';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// initiate payout controller
const initiateSettlement = catchAsync(async (req, res) => {
  const { targetUserId } = req.body;
  const currentUser = req.user as TCurrentUser;
  const result = await PayoutServices.initiateSettlement(
    targetUserId,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Initiated Payout Settlement',
    target: `Vendor #${targetUserId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// finalize payout controller
const finalizeSettlement = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const currentUser = req.user as TCurrentUser;
  const result = await PayoutServices.finalizeSettlement(
    req.params.payoutId,
    req.body,
    file?.path ?? null,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Finalized Payout Settlement',
    target: `Payout #${req.params.payoutId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
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
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
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
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

export const PayoutController = {
  initiateSettlement,
  finalizeSettlement,
  getAllPayouts,
  getSinglePayout,
};
