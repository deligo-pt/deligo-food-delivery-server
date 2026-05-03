import { Router } from 'express';
import { AnalyticsControllers } from './analytics.controller';
import auth from '../../middlewares/auth';

const router = Router();

// ----------------------------------------------------------------------------------
// ---------------- ANALYTICS ROUTES (Developer Morshed) ----------------------------
// ----------------------------------------------------------------------------------
// get vendor sales analytics
router.get(
  '/vendor-sales-analytics',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getVendorSalesAnalytics,
);

// get customer insights
router.get(
  '/customer-insights',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getCustomerInsights,
);

// get order trend insights
router.get(
  '/order-trend-insights',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getOrderTrendInsights,
);

// get top selling items analytics
router.get(
  '/top-selling-analytics',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getTopSellingItemsAnalytics,
);

// get admin sales report analytics
router.get(
  '/admin/sales-report-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminSalesReportAnalytics,
);

// get admin order report analytics
router.get(
  '/admin/order-report-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminOrderReportAnalytics,
);

// get admin customer report analytics
router.get(
  '/admin/customer-report-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminCustomerReportAnalytics,
);

// get admin vendor report analytics
router.get(
  '/admin/vendor-report-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminVendorReportAnalytics,
);

// get admin fleet manager report analytics
router.get(
  '/admin/fleet-manager-report-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminFleetManagerReportAnalytics,
);

// get admin delivery partner report analytics
router.get(
  '/admin/delivery-partner-report-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminDeliveryPartnerReportAnalytics,
);

// get vendor sales report analytics
router.get(
  '/vendor-sales-report-analytics',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getVendorSalesReportAnalytics,
);

// get vendor sales report analytics
router.get(
  '/vendor-customer-report',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getVendorCustomerReport,
);

// get vendor tax report analytics
router.get(
  '/vendor/tax-report',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getVendorTaxReport,
);

// get fleet performance analytics
router.get(
  '/admin/fleet-performance-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getFleetManagerPerformanceAnalytics,
);

// get fleet performance details analytics
router.get(
  '/admin/fleet-performance-details-analytics/:fleetManagerId',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getSingleFleetPerformanceDetailsAnalytics,
);

// get admin sales analytics
router.get(
  '/admin/sales-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminSalesAnalytics,
);

// get delivery partner performance analytics
router.get(
  '/admin/delivery-partner-performance-analytics',
  auth("ADMIN", "SUPER_ADMIN"),
  AnalyticsControllers.getDeliveryPartnerPerformanceAnalytics,
);

// get delivery partner performance details analytics
router.get(
  '/admin/delivery-partner-performance-details-analytics/:partnerUserId',
  auth("ADMIN", "SUPER_ADMIN"),
  AnalyticsControllers.getSingleDeliveryPartnerPerformanceDetailsAnalytics,
);

// get admin customer insights
router.get(
  '/admin/customer-insights',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminCustomerInsights,
);

// get admin platform earnings
router.get(
  '/admin/platform-earnings',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getPlatformEarnings,
);

// get top vendors
router.get(
  '/admin/top-vendors',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminTopVendors,
);

// get peak hours
router.get(
  '/admin/peak-hours',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminPeakHourAnalytics,
);

// get delivery insights
router.get(
  '/admin/delivery-insights',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminDeliveryInsights,
);


// ----------------------------------------------------------------------------------
// ---------------- ANALYTICS ROUTES (Developer Umayer) ----------------------------
// ----------------------------------------------------------------------------------

// get admin dashboard analytics
router.get(
  '/admin/dashboard-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAdminDashboardAnalytics,
);

// get vendor dashboard analytics
router.get(
  '/vendor/dashboard-analytics',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getVendorDashboardAnalytics,
);

// get fleet dashboard analytics
router.get(
  '/fleet/dashboard-analytics',
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
  '/partner/earning-analytics',
  auth('DELIVERY_PARTNER'),
  AnalyticsControllers.getDeliveryPartnerEarningAnalytics,
);

// Fleet manager earning analytics route
router.get(
  '/fleet/earning-analytics',
  auth('FLEET_MANAGER'),
  AnalyticsControllers.getFleetManagerEarningAnalytics,
);

// get vendor earnings analytics
router.get(
  '/vendor/earnings-analytics',
  auth('VENDOR', 'SUB_VENDOR'),
  AnalyticsControllers.getVendorEarningsAnalytics,
);

// get all customer analytics
router.get(
  '/admin/all-customers-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getAllCustomerAnalytics,
);

// get vendor performance analytics
router.get(
  '/admin/vendor-performance-analytics',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getVendorPerformanceAnalytics,
);

// get single vendor performance details
router.get(
  '/admin/vendor-performance-analytics/:vendorUserId',
  auth('ADMIN', 'SUPER_ADMIN'),
  AnalyticsControllers.getSingleVendorPerformanceDetails,
);

export const AnalyticsRoutes = router;
