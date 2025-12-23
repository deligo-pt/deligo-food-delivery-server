import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AnalyticsServices } from './analytics.service';
import { AuthUser } from '../../constant/user.constant';

// get admin dashboard analytics
const getAdminDashboardAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getAdminDashboardAnalytics(
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin dashboard analytics fetched successfully',
    data: result,
  });
});

// get vendor dashboard analytics
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

export const AnalyticsControllers = {
  getAdminDashboardAnalytics,
  getVendorDashboardAnalytics,
};
