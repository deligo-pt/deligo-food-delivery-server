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
    req.user as AuthUser
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
    req.user as AuthUser
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
    req.query
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Partner performance analytics fetched successfully',
    data: result,
  });
});

export const AnalyticsControllers = {
  getAdminDashboardAnalytics,
  getVendorDashboardAnalytics,
  getFleetDashboardAnalytics,
  getPartnerPerformanceAnalytics,
};
