import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CouponServices } from './coupon.service';
import { AuthUser } from '../../constant/user.constant';

// create coupon controller
const createCoupon = catchAsync(async (req, res) => {
  const result = await CouponServices.createCoupon(
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: result?.message,
    data: result?.data,
  });
});

// update coupon controller
const updateCoupon = catchAsync(async (req, res) => {
  const { couponId } = req.params;
  const result = await CouponServices.updateCoupon(
    couponId,
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

// apply coupon controller
const applyCoupon = catchAsync(async (req, res) => {
  const { code, type } = req.body;
  const result = await CouponServices.applyCoupon(
    code,
    req.user as AuthUser,
    type
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Coupon applied successfully',
    data: result,
  });
});

// toggle coupon controller
const toggleCouponStatus = catchAsync(async (req, res) => {
  const { couponId } = req.params;
  const result = await CouponServices.toggleCouponStatus(
    couponId,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
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

// get single coupon controller
const getSingleCoupon = catchAsync(async (req, res) => {
  const { couponId } = req.params;
  const result = await CouponServices.getSingleCoupon(
    couponId,
    req?.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Coupon retrieved successfully',
    data: result,
  });
});

// soft delete coupon controller
const softDeleteCoupon = catchAsync(async (req, res) => {
  const { couponId } = req.params;
  const result = await CouponServices.softDeleteCoupon(
    couponId,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// permanent delete coupon controller
const permanentDeleteCoupon = catchAsync(async (req, res) => {
  const { couponId } = req.params;
  const result = await CouponServices.permanentDeleteCoupon(
    couponId,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

export const CouponControllers = {
  createCoupon,
  updateCoupon,
  applyCoupon,
  toggleCouponStatus,
  getAllCoupons,
  getSingleCoupon,
  softDeleteCoupon,
  permanentDeleteCoupon,
};
