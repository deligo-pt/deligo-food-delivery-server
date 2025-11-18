import { Router } from 'express';
import { AnalyticsControllers } from './analytics.controller';
import auth from '../../middlewares/auth';

const router = Router();

router.get(
  '/overview',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.overview
);

router.get(
  '/monthly-orders',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.monthlyOrders
);

router.get(
  '/vendor-stats',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.vendorStats
);

router.get(
  '/fleet-manager',
  auth('FLEET_MANAGER'),
  AnalyticsControllers.fleetManagerAnalytics
);

router.get('/vendor', auth('VENDOR'), AnalyticsControllers.vendorAnalytics);

export const AnalyticsRoutes = router;
