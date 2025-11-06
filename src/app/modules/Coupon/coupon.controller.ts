import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CouponServices } from './coupon.service';
import { AuthUser } from '../../constant/user.const';

// create coupon controller
const createCoupon = catchAsync(async (req, res) => {
  const result = await CouponServices.createCoupon(
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Coupon created successfully',
    data: result,
  });
});

export const CouponControllers = {
  createCoupon,
};
