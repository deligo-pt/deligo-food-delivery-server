import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AnalyticsServices } from './analytics.service';
import { AuthUser } from '../../constant/user.constant';

// ----------------------------------------------------------------------------------
// ---------------- ANALYTICS CONTROLLERS (Developer Morshed) -----------------------
// ----------------------------------------------------------------------------------
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
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin sales report analytics fetched successfully',
    data: result,
  });
});

// get admin order report analytics controller
const getAdminOrderReportAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getAdminOrderReportAnalytics(
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin order report analytics fetched successfully',
    data: result,
  });
});

// get admin customer report analytics controller
const getAdminCustomerReportAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getAdminCustomerReportAnalytics();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin customer report analytics fetched successfully',
    data: result,
  });
});

// get admin vendor report analytics controller
const getAdminVendorReportAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getAdminVendorReportAnalytics();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin vendor report analytics fetched successfully',
    data: result,
  });
});

// get admin fleet manager report analytics controller
const getAdminFleetManagerReportAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getAdminFleetManagerReportAnalytics();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin fleet manager report analytics fetched successfully',
    data: result,
  });
});

// get admin delivery partner report analytics controller
const getAdminDeliveryPartnerReportAnalytics = catchAsync(async (req, res) => {
  const result =
    await AnalyticsServices.getAdminDeliveryPartnerReportAnalytics();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin delivery partner report analytics fetched successfully',
    data: result,
  });
});

// get admin delivery partner report analytics controller
const getVendorSalesReportAnalytics = catchAsync(async (req, res) => {
  const result =
    await AnalyticsServices.getVendorSalesReportAnalytics(
      req.user as AuthUser
    );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor sales report analytics fetched successfully',
    data: result,
  });
});

// get admin delivery partner report analytics controller
const getVendorCustomerReport = catchAsync(async (req, res) => {
  const result =
    await AnalyticsServices.getVendorCustomerReport(
      req.user as AuthUser,
      req.query
    );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor customer report fetched successfully',
    data: result,
  });
});

// get fleet performance analytics controller
const getFleetManagerPerformanceAnalytics = catchAsync(async (req, res) => {
  const result =
    await AnalyticsServices.getFleetManagerPerformanceAnalytics(
      req.query as Record<string, unknown>
    );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin fleet manager performance analytics fetched successfully',
    data: result,
  });
});
// get admin delivery partner report analytics controller
const getSingleFleetPerformanceDetailsAnalytics = catchAsync(async (req, res) => {
  const { fleetManagerId } = req.params;
  const result = await AnalyticsServices.getSingleFleetPerformanceDetailsAnalytics(fleetManagerId as string);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Single fleet manager performance analytics fetched successfully',
    data: result,
  });
});

// ----------------------------------------------------------------------------------
// ---------------- ANALYTICS CONTROLLERS (Developer Umayer) -----------------------
// ----------------------------------------------------------------------------------

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

// get vendor earnings analytics controller
const getVendorEarningsAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getVendorEarningsAnalytics(
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
  const result = await AnalyticsServices.getAllCustomerAnalytics(req.query);
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
  const result = await AnalyticsServices.getVendorPerformanceAnalytics(
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
  const result = await AnalyticsServices.getSingleVendorPerformanceDetails(
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

export const AnalyticsControllers = {
  // ---------------------------------------
  // Analytics Services (Developer Morshed)
  // ---------------------------------------
  getVendorSalesAnalytics,
  getCustomerInsights,
  getOrderTrendInsights,
  getTopSellingItemsAnalytics,
  getAdminSalesReportAnalytics,
  getAdminOrderReportAnalytics,
  getAdminCustomerReportAnalytics,
  getAdminVendorReportAnalytics,
  getAdminFleetManagerReportAnalytics,
  getAdminDeliveryPartnerReportAnalytics,
  getVendorSalesReportAnalytics,
  getVendorCustomerReport,
  getFleetManagerPerformanceAnalytics,
  getSingleFleetPerformanceDetailsAnalytics,
  // ---------------------------------------
  // Analytics Services (Developer Umayer)
  // ---------------------------------------
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
};
