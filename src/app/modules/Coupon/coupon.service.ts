// create coupon service

import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TCoupon } from './coupon.interface';
import { Coupon } from './coupon.model';
import { AuthUser } from '../../constant/user.const';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';

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

export const CouponServices = {
  createCoupon,
};
