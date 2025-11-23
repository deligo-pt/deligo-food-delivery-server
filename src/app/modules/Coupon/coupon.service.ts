import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TCoupon } from './coupon.interface';
import { Coupon } from './coupon.model';
import { AuthUser } from '../../constant/user.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { QueryBuilder } from '../../builder/QueryBuilder';

// create coupon service
const createCoupon = async (payload: TCoupon, currentUser: AuthUser) => {
  const existingCurrentUser = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  if (existingCurrentUser.user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to create a coupon. Your account is ${existingCurrentUser.user.status}`
    );
  }

  const existingCoupon = await Coupon.findOne({ code: payload.code });
  if (existingCoupon) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Coupon code already exists');
  }
  const newCoupon = await Coupon.create(payload);
  return newCoupon;
};

// update coupon service
const updateCoupon = async (
  couponId: string,
  payload: Partial<TCoupon>,
  currentUser: AuthUser
) => {
  const existingCurrentUser = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  if (existingCurrentUser.user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to update a coupon. Your account is ${existingCurrentUser.user.status}`
    );
  }

  const existingCoupon = await Coupon.findById(couponId);
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

  const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, payload, {
    new: true,
  });
  return updatedCoupon;
};

// get all coupons service
const getAllCoupons = async (
  currentUser: AuthUser,
  query: Record<string, unknown>
) => {
  const existingCurrentUser = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  if (existingCurrentUser.user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view coupons. Your account is ${existingCurrentUser.user.status}`
    );
  }

  const coupons = new QueryBuilder(Coupon.find(), query)
    .filter()
    .sort()
    .paginate()
    .fields()
    .search(['code', 'description']);
  const meta = await coupons.countTotal();
  const data = await coupons.modelQuery;

  return { meta, data };
};

// get single coupon service
const getSingleCoupon = async (couponId: string, currentUser: AuthUser) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (result.user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view a coupon. Your account is ${result.user.status}`
    );
  }

  const existingCoupon = await Coupon.findById(couponId);
  if (!existingCoupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }
  return existingCoupon;
};

// coupon soft delete service
const softDeleteCoupon = async (couponId: string, currentUser: AuthUser) => {
  const existingCurrentUser = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (existingCurrentUser.user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete a coupon. Your account is ${existingCurrentUser.user.status}`
    );
  }

  const existingCoupon = await Coupon.findById(couponId);
  if (!existingCoupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  if (existingCoupon.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Active coupons cannot be deleted'
    );
  }

  existingCoupon.isDeleted = true;
  await existingCoupon.save();
  return {
    message: 'Coupon deleted successfully',
  };
};

// coupon permanent delete service
const permanentDeleteCoupon = async (
  couponId: string,
  currentUser: AuthUser
) => {
  const existingCurrentUser = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (existingCurrentUser.user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete a coupon. Your account is ${existingCurrentUser.user.status}`
    );
  }
  const existingCoupon = await Coupon.findById(couponId);
  if (!existingCoupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  if (existingCoupon?.isDeleted === false) {
    throw new AppError(httpStatus.CONFLICT, 'Please soft delete first');
  }

  await existingCoupon.deleteOne();
  return {
    message: 'Coupon deleted permanently',
  };
};

export const CouponServices = {
  createCoupon,
  updateCoupon,
  getAllCoupons,
  getSingleCoupon,
  softDeleteCoupon,
  permanentDeleteCoupon,
};
