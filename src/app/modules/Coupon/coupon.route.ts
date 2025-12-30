import { Router } from 'express';
import { CouponControllers } from './coupon.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CouponValidation } from './coupon.validation';

const router = Router();

// create coupon
router.post(
  '/create-coupon',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  validateRequest(CouponValidation.createCouponValidationSchema),
  CouponControllers.createCoupon
);

// update coupon
router.patch(
  '/:couponId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  validateRequest(CouponValidation.updateCouponValidationSchema),
  CouponControllers.updateCoupon
);

// apply coupon
router.post(
  '/apply-coupon',
  auth('CUSTOMER'),
  validateRequest(CouponValidation.applyCouponValidationSchema),
  CouponControllers.applyCoupon
);

// toggle coupon status
router.patch(
  '/toggle-coupon-status/:couponId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  CouponControllers.toggleCouponStatus
);

// get coupon analytics route
router.get(
  '/:couponId/analytics',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  CouponControllers.getCouponAnalytics
);

// get coupon monthly analytics
router.get(
  '/:couponId/analytics/monthly',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  CouponControllers.getCouponMonthlyAnalytics
);

// get all coupons
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR', 'CUSTOMER'),
  CouponControllers.getAllCoupons
);
// get single coupon
router.get(
  '/:couponId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR', 'CUSTOMER'),
  CouponControllers.getSingleCoupon
);

// soft delete coupon
router.delete(
  '/soft-delete/:couponId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  CouponControllers.softDeleteCoupon
);

// permanent delete coupon
router.delete(
  '/permanent-delete/:couponId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR'),
  CouponControllers.permanentDeleteCoupon
);

export const CouponRoutes = router;
