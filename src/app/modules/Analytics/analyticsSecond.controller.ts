import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthUser } from '../../constant/user.constant';
import { AnalyticsSecondServices } from './analyticsSecond.service';

// ----------------------------------------------------------------------------------
// ---------------- ANALYTICS CONTROLLERS (Developer Umayer) -----------------------
// ----------------------------------------------------------------------------------

// get admin dashboard analytics controller
const getAdminDashboardAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getAdminDashboardAnalytics();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin dashboard analytics fetched successfully',
    data: result,
  });
});

// get vendor dashboard analytics controller
const getVendorDashboardAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getVendorDashboardAnalytics(
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
  const result = await AnalyticsSecondServices.getFleetDashboardAnalytics(
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
  const result = await AnalyticsSecondServices.getPartnerPerformanceAnalytics(
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

// get delivery partner earnings analytics  controller
const getDeliveryPartnerEarningAnalytics = catchAsync(async (req, res) => {
  const result =
    await AnalyticsSecondServices.getDeliveryPartnerEarningAnalytics(
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
  const result = await AnalyticsSecondServices.getFleetManagerEarningAnalytics(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Fleet manager earning analytics fetched successfully',
    data: result,
  });
});

// get vendor earnings analytics controller
const getVendorEarningsAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getVendorEarningsAnalytics(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor earnings analytics fetched successfully',
    data: result,
  });
});

// get all customer analytics controller
const getAllCustomerAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getAllCustomerAnalytics(
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All customers analytics fetched successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// get vendor performance analytics controller
const getVendorPerformanceAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getVendorPerformanceAnalytics(
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor performance analytics fetched successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// get single vendor performance details controller
const getSingleVendorPerformanceDetails = catchAsync(async (req, res) => {
  const { vendorUserId } = req.params;
  const result =
    await AnalyticsSecondServices.getSingleVendorPerformanceDetails(
      vendorUserId,
      req.user as AuthUser,
    );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Single vendor performance details fetched successfully',
    data: result,
  });
});

// get offer analytics for admin
const getOfferAnalyticsForAdmin = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getOfferAnalyticsForAdmin(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Offer analytics for admin fetched successfully',
    data: result,
  });
});

export const AnalyticsSecondControllers = {
  getAdminDashboardAnalytics,
  getVendorDashboardAnalytics,
  getFleetDashboardAnalytics,
  getPartnerPerformanceAnalytics,
  getDeliveryPartnerEarningAnalytics,
  getFleetManagerEarningAnalytics,
  getVendorEarningsAnalytics,
  getAllCustomerAnalytics,
  getVendorPerformanceAnalytics,
  getSingleVendorPerformanceDetails,
  getOfferAnalyticsForAdmin,
};
