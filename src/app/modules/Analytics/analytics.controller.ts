import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AnalyticsServices } from './analytics.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

// ----------------------------------------------------------------------------------
// ---------------- ANALYTICS CONTROLLERS (Developer Morshed) -----------------------
// ----------------------------------------------------------------------------------
// get vendor sales analytics controller
const getVendorSalesAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getVendorSalesAnalytics(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'VENDOR_SALES_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get customer insights controller
const getCustomerInsights = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getCustomerInsights(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'CUSTOMER_INSIGHTS_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get order trend insights controller
const getOrderTrendInsights = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getOrderTrendInsights(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'ORDER_TREND_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get top selling items analytics controller
const getTopSellingItemsAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getTopSellingItemsAnalytics(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'TOP_SELLING_FETCH_SUCCESS',
    data: result?.data,
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
    messageKey: 'ADMIN_SALES_REPORT_FETCH_SUCCESS',
    data: result?.data,
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
    messageKey: 'ADMIN_ORDER_REPORT_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get admin customer report analytics controller
const getAdminCustomerReportAnalytics = catchAsync(async (req, res) => {
  const { timeframe, fromDate, toDate } = req.query;

  const result = await AnalyticsServices.getAdminCustomerReportAnalytics(
    timeframe as string,
    fromDate as string,
    toDate as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'ADMIN_CUSTOMER_REPORT_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get admin vendor report analytics controller
const getAdminVendorReportAnalytics = catchAsync(async (req, res) => {
  const { timeframe, fromDate, toDate } = req.query;

  const result = await AnalyticsServices.getAdminVendorReportAnalytics(
    timeframe as string,
    fromDate as string,
    toDate as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'ADMIN_VENDOR_REPORT_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get admin fleet manager report analytics controller
const getAdminFleetManagerReportAnalytics = catchAsync(async (req, res) => {
  const { timeframe, fromDate, toDate } = req.query;

  const result = await AnalyticsServices.getAdminFleetManagerReportAnalytics(
    timeframe as string,
    fromDate as string,
    toDate as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'ADMIN_FLEET_REPORT_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get admin delivery partner report analytics controller
const getAdminDeliveryPartnerReportAnalytics = catchAsync(async (req, res) => {
  const { timeframe, fromDate, toDate } = req.query;
  const result = await AnalyticsServices.getAdminDeliveryPartnerReportAnalytics(
    timeframe as string,
    fromDate as string,
    toDate as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'ADMIN_PARTNER_REPORT_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get admin delivery partner report analytics controller
const getVendorSalesReportAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getVendorSalesReportAnalytics(
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'VENDOR_SALES_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get admin delivery partner report analytics controller
const getVendorCustomerReport = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getVendorCustomerReport(
    req.user as TCurrentUser,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'VENDOR_CUSTOMER_REPORT_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get admin delivery partner report analytics controller
const getVendorTaxReport = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getVendorTaxReport(
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'VENDOR_TAX_REPORT_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get fleet performance analytics controller
const getFleetManagerPerformanceAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getFleetManagerPerformanceAnalytics(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'FLEET_PERFORMANCE_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get admin delivery partner report analytics controller
const getSingleFleetPerformanceDetailsAnalytics = catchAsync(
  async (req, res) => {
    const { fleetManagerId } = req.params;
    const result =
      await AnalyticsServices.getSingleFleetPerformanceDetailsAnalytics(
        fleetManagerId as string,
      );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      messageKey: 'SINGLE_FLEET_DETAILS_FETCH_SUCCESS',
      data: result?.data,
    });
  },
);

// get delivery partner performance analytics controller
const getDeliveryPartnerPerformanceAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getDeliveryPartnerPerformanceAnalytics(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'PARTNER_PERFORMANCE_FETCH_SUCCESS',
    meta: result?.meta,
    data: result?.data,
  });
});

// get single delivery partner performance analytics controller
const getSingleDeliveryPartnerPerformanceDetailsAnalytics = catchAsync(
  async (req, res) => {
    const { partnerUserId } = req.params;
    const result =
      await AnalyticsServices.getSingleDeliveryPartnerPerformanceDetailsAnalytics(
        partnerUserId,
      );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      messageKey: 'SINGLE_PARTNER_DETAILS_FETCH_SUCCESS',
      data: result?.data,
    });
  },
);

// get platform earnings controller
const getPlatformEarnings = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getPlatformEarnings(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'PLATFORM_EARNINGS_FETCH_SUCCESS',
    meta: result?.meta,
    data: result?.data,
  });
});

// get admin delivery partner report analytics controller
const getAdminSalesAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getAdminSalesAnalytics(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'ADMIN_SALES_REPORT_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get customer insights controller
const getAdminCustomerInsights = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getAdminCustomerInsights(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'CUSTOMER_INSIGHTS_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get top vendors controller
const getTopVendors = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getTopVendors(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'TOP_VENDORS_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get peak hours controller
const getPeakHourAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getPeakHourAnalytics(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'PEAK_HOUR_FETCH_SUCCESS',
    data: result?.data,
  });
});

// get delivery insights controller
const getDeliveryInsights = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getDeliveryInsights(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: 'DELIVERY_INSIGHTS_FETCH_SUCCESS',
    data: result?.data,
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
  getVendorTaxReport,
  getFleetManagerPerformanceAnalytics,
  getSingleFleetPerformanceDetailsAnalytics,
  getAdminSalesAnalytics,
  getDeliveryPartnerPerformanceAnalytics,
  getSingleDeliveryPartnerPerformanceDetailsAnalytics,
  getAdminCustomerInsights,
  getPlatformEarnings,
  getTopVendors,
  getPeakHourAnalytics,
  getDeliveryInsights,
};
