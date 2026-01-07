import { Router } from 'express';
import { AnalyticsControllers } from './analytics.controller';
import auth from '../../middlewares/auth';

const router = Router();

// get admin dashboard analytics
router.get(
  '/admin-dashboard-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminDashboardAnalytics
);

// get vendor dashboard analytics
router.get(
  '/vendor-dashboard-analytics',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getVendorDashboardAnalytics
);

// get fleet dashboard analytics
router.get(
  '/fleet-dashboard-analytics',
  auth('FLEET_MANAGER'),
  AnalyticsControllers.getFleetDashboardAnalytics
);

// get partner performance analytics
router.get(
  '/partner-performance-analytics',
  auth('DELIVERY_PARTNER', 'FLEET_MANAGER'),
  AnalyticsControllers.getPartnerPerformanceAnalytics
);

export const AnalyticsRoutes = router;
