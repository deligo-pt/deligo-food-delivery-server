import { Router } from 'express';
import auth from '../../middlewares/auth';
import { ReferralController } from './referral.controller';

const router = Router();

router.get(
  '/my-referrals',
  auth('CUSTOMER', 'DELIVERY_PARTNER', 'VENDOR'),
  ReferralController.getMyReferralStats,
);

export const ReferralRoutes = router;
