import { Router } from 'express';
import { CouponControllers } from './coupon.controller';
import auth from '../../middlewares/auth';

const router = Router();

// create coupon
router.post(
  '/create-coupon',
  auth('ADMIN', 'SUPER_ADMIN'),
  CouponControllers.createCoupon
);

export const CouponRoutes = router;
