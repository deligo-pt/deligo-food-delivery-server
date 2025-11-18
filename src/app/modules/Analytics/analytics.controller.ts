import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AnalyticsServices } from './analytics.service';

const overview = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getOverview();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Analytics fetched successfully',
    data: result,
  });
});

const monthlyOrders = catchAsync(async (req, res) => {
  const year = Number(req.query.year);
  const result = await AnalyticsServices.getMonthlyOrders(year);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Monthly orders fetched successfully',
    data: result,
  });
});

const vendorStats = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getVendorStats();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor stats fetched successfully',
    data: result,
  });
});

const fleetManagerAnalytics = catchAsync(async (req, res) => {
  const currentUser = req.user;

  const result = await AnalyticsServices.getFleetManagerAnalytics(
    currentUser?.id
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Fleet manager analytics fetched successfully',
    data: result,
  });
});

const vendorAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getVendorAnalytics(req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor analytics fetched successfully',
    data: result,
  });
});

export const AnalyticsControllers = {
  overview,
  monthlyOrders,
  vendorStats,
  fleetManagerAnalytics,
  vendorAnalytics,
};
