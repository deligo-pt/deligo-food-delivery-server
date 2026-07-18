import { Router } from 'express';
import auth from '../../middlewares/auth';
import { LoginHistoryControllers } from './loginHistory.controller';

const router = Router();

router.get(
  '/',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'FLEET_MANAGER',
    'VENDOR',
    'SUB_VENDOR',
    'DELIVERY_PARTNER',
    'CUSTOMER',
  ),
  LoginHistoryControllers.getAllLoginHistory,
);

router.get(
  '/:id',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'FLEET_MANAGER',
    'VENDOR',
    'SUB_VENDOR',
    'DELIVERY_PARTNER',
    'CUSTOMER',
  ),
  LoginHistoryControllers.getSingleLoginHistory,
);

export const LoginHistoryRoutes = router;
