import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ReferralServices } from './referral.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

const getMyReferralStats = catchAsync(async (req, res) => {
  const result = await ReferralServices.getReferralStats(
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Referral statistics and history retrieved successfully.',
    data: result,
  });
});

export const ReferralController = {
  getMyReferralStats,
};
