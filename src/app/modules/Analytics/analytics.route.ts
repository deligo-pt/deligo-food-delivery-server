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

// get vendor sales analytics
router.get(
  '/vendor-sales-analytics',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getVendorSalesAnalytics
);

// get customer insights
router.get(
  '/customer-insights',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getCustomerInsights
);

// get order trend insights
router.get(
  '/order-trend-insights',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getOrderTrendInsights
);

export const AnalyticsRoutes = router;
