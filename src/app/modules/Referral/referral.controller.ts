import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ReferralServices } from './referral.service';
import { AuthUser } from '../../constant/user.constant';

const getMyReferralStats = catchAsync(async (req, res) => {
  const result = await ReferralServices.getReferralStats(req.user as AuthUser);

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
