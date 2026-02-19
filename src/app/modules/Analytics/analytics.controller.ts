import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AnalyticsServices } from './analytics.service';
import { AuthUser } from '../../constant/user.constant';

// get admin dashboard analytics controller
const getAdminDashboardAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getAdminDashboardAnalytics();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin dashboard analytics fetched successfully',
    data: result,
  });
});

// get vendor dashboard analytics controller
const getVendorDashboardAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getVendorDashboardAnalytics(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor dashboard analytics fetched successfully',
    data: result,
  });
});

// get fleet dashboard analytics controller
const getFleetDashboardAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getFleetDashboardAnalytics(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Fleet dashboard analytics fetched successfully',
    data: result,
  });
});

// get partner performance analytics controller
const getPartnerPerformanceAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getPartnerPerformanceAnalytics(
    req.user as AuthUser,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Partner performance analytics fetched successfully',
    data: result,
  });
});

// get vendor sales analytics controller
const getVendorSalesAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getVendorSalesAnalytics(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor sales analytics fetched successfully',
    data: result,
  });
});

// get customer insights controller
const getCustomerInsights = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getCustomerInsights(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Customer insights fetched successfully',
    data: result,
  });
});

// get delivery partner earnings analytics  controller
const getDeliveryPartnerEarningAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getDeliveryPartnerEarningAnalytics(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery partner earning analytics fetched successfully',
    data: result,
  });
});

// get fleet manager earning analytics controller
const getFleetManagerEarningAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getFleetManagerEarningAnalytics(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Fleet manager earning analytics fetched successfully',
    data: result,
  });
});

// get order trend insights controller
const getOrderTrendInsights = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getOrderTrendInsights(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Order trend insights fetched successfully',
    data: result,
  });
});

// get top selling items analytics controller
const getTopSellingItemsAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getTopSellingItemsAnalytics(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Top selling items analytics fetched successfully',
    data: result,
  });
});

// get admin sales report analytics controller
const getAdminSalesReportAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getAdminSalesReportAnalytics(
    req.user as AuthUser,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin sales report analytics fetched successfully',
    data: result,
  });
});

export const AnalyticsControllers = {
  getAdminDashboardAnalytics,
  getVendorDashboardAnalytics,
  getFleetDashboardAnalytics,
  getPartnerPerformanceAnalytics,
  getVendorSalesAnalytics,
  getCustomerInsights,
  getOrderTrendInsights,
  getTopSellingItemsAnalytics,
  getDeliveryPartnerEarningAnalytics,
  getFleetManagerEarningAnalytics,
  getAdminSalesReportAnalytics
};
