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

// update coupon controller
const updateCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await CouponServices.updateCoupon(
    id,
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Coupon updated successfully',
    data: result,
  });
});

// get all coupons controller
const getAllCoupons = catchAsync(async (req, res) => {
  const result = await CouponServices.getAllCoupons(
    req.user as AuthUser,
    req.query
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Coupons retrieved successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// delete coupon controller
const deleteCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await CouponServices.deleteCoupon(id, req.user as AuthUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Coupon deleted successfully',
    data: result,
  });
});

export const CouponControllers = {
  createCoupon,
  updateCoupon,
  getAllCoupons,
  deleteCoupon,
};
