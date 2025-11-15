import { Router } from 'express';
import { CouponControllers } from './coupon.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CouponValidation } from './coupon.validation';

const router = Router();

// create coupon
router.post(
  '/create-coupon',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CouponValidation.createCouponValidationSchema),
  CouponControllers.createCoupon
);

// update coupon
router.patch(
  '/:couponId',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CouponValidation.updateCouponValidationSchema),
  CouponControllers.updateCoupon
);

// get all coupons
router.get('/', auth('ADMIN', 'SUPER_ADMIN'), CouponControllers.getAllCoupons);

// delete coupon
router.delete(
  '/:couponId',
  auth('ADMIN', 'SUPER_ADMIN'),
  CouponControllers.deleteCoupon
);

export const CouponRoutes = router;
