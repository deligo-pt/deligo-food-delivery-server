import { AuthUser } from '../../constant/user.constant';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { LoyaltyServices } from './loyalty.service';
import httpStatus from 'http-status';

const addOrderPoints = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const { _id: userId, role } = currentUser;

  const result = await LoyaltyServices.addOrderPoints(
    userId,
    role,
    req.body.orderId,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Order points added successfully',
    data: result,
  });
});

export const LoyaltyController = {
  addOrderPoints,
};
