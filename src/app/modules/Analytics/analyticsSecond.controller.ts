import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
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
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

// get vendor dashboard analytics controller
const getVendorDashboardAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getVendorDashboardAnalytics(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

// get fleet dashboard analytics controller
const getFleetDashboardAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getFleetDashboardAnalytics(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

// get partner performance analytics controller
const getPartnerPerformanceAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getPartnerPerformanceAnalytics(
    req.user as TCurrentUser,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

// get delivery partner earnings analytics  controller
const getDeliveryPartnerEarningAnalytics = catchAsync(async (req, res) => {
  const result =
    await AnalyticsSecondServices.getDeliveryPartnerEarningAnalytics(
      req.user as TCurrentUser,
    );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

// get fleet manager earning analytics controller
const getFleetManagerEarningAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getFleetManagerEarningAnalytics(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

// get vendor earnings analytics controller
const getVendorEarningsAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getVendorEarningsAnalytics(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
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
    messageKey: result?.messageKey,
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
    messageKey: result?.messageKey,
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
      req.user as TCurrentUser,
    );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

// get offer analytics for admin
const getOfferAnalyticsForAdmin = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getOfferAnalyticsForAdmin(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

const getTaxReportAnalyticsForVendor = catchAsync(async (req, res) => {
  const result = await AnalyticsSecondServices.getTaxReportAnalyticsForVendor(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
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
  getTaxReportAnalyticsForVendor,
};
