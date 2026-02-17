import { Router } from 'express';
import { AnalyticsControllers } from './analytics.controller';
import auth from '../../middlewares/auth';

const router = Router();

// get admin dashboard analytics
router.get(
  '/admin-dashboard-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminDashboardAnalytics,
);

// get vendor dashboard analytics
router.get(
  '/vendor-dashboard-analytics',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getVendorDashboardAnalytics,
);

// get fleet dashboard analytics
router.get(
  '/fleet-dashboard-analytics',
  auth('FLEET_MANAGER'),
  AnalyticsControllers.getFleetDashboardAnalytics,
);

// get partner performance analytics
router.get(
  '/partner-performance-analytics',
  auth('DELIVERY_PARTNER', 'FLEET_MANAGER'),
  AnalyticsControllers.getPartnerPerformanceAnalytics,
);

// Delivery Partner earning analytics route
router.get(
  '/delivery-partner-earning-analytics',
  auth('DELIVERY_PARTNER'),
  AnalyticsControllers.getDeliveryPartnerEarningAnalytics,
);

// Fleet manager earning analytics route
router.get(
  '/fleet-manager-earning-analytics',
  auth('FLEET_MANAGER'),
  AnalyticsControllers.getFleetManagerEarningAnalytics,
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

// get top selling items analytics
router.get(
  '/top-selling-analytics',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getTopSellingItemsAnalytics
);

export const AnalyticsRoutes = router;
