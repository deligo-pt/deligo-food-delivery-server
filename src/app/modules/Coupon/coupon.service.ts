import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TCoupon } from './coupon.interface';
import { Coupon } from './coupon.model';
import { AuthUser } from '../../constant/user.const';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';

// create coupon service
const createCoupon = async (payload: TCoupon, currentUser: AuthUser) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const existingCoupon = await Coupon.findOne({ code: payload.code });
  if (existingCoupon) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Coupon code already exists');
  }
  const newCoupon = await Coupon.create(payload);
  return newCoupon;
};

// update coupon service
const updateCoupon = async (
  id: string,
  payload: Partial<TCoupon>,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const existingCoupon = await Coupon.findById(id);
  if (!existingCoupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  if (payload.code && payload.code !== existingCoupon.code) {
    const couponWithSameCode = await Coupon.findOne({ code: payload.code });
    if (couponWithSameCode) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Coupon code already exists');
    }
  }

  if (payload.applicableCategories) {
    const mergedCategories = [
      ...(existingCoupon.applicableCategories || []),
      ...payload.applicableCategories,
    ];

    payload.applicableCategories = Array.from(new Set(mergedCategories)).filter(
      (c) => c.trim() !== ''
    );
  }

  const updatedCoupon = await Coupon.findByIdAndUpdate(id, payload, {
    new: true,
  });
  return updatedCoupon;
};

// get all coupons service
const getAllCoupons = async (currentUser: AuthUser) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const coupons = await Coupon.find();
  return coupons;
};

// coupon delete service
const deleteCoupon = async (id: string, currentUser: AuthUser) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const existingCoupon = await Coupon.findById(id);
  if (!existingCoupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  if (existingCoupon.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Active coupons cannot be deleted'
    );
  }

  await Coupon.findByIdAndDelete(id);
  return existingCoupon;
};

export const CouponServices = {
  createCoupon,
  updateCoupon,
  getAllCoupons,
  deleteCoupon,
};
