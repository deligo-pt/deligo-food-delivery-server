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
  const { timeframe, fromDate, toDate } = req.query;

  const result = await AnalyticsServices.getAdminCustomerReportAnalytics(
    timeframe as string,
    fromDate as string,
    toDate as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin customer report analytics fetched successfully',
    data: result,
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
    message: 'Admin vendor report analytics fetched successfully',
    data: result,
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
    message: 'Admin fleet manager report analytics fetched successfully',
    data: result,
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
    message: 'Admin delivery partner report analytics fetched successfully',
    data: result,
  });
});

// get admin delivery partner report analytics controller
const getVendorSalesReportAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getVendorSalesReportAnalytics(
    req.user as AuthUser,
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
  const result = await AnalyticsServices.getVendorCustomerReport(
    req.user as AuthUser,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor customer report fetched successfully',
    data: result,
  });
});

// get admin delivery partner report analytics controller
const getVendorTaxReport = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getVendorTaxReport(
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor Tax report fetched successfully',
    data: result,
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
    message: 'Fleet manager performance analytics fetched successfully',
    data: result,
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
      message:
        'Single fleet manager performance analytics fetched successfully',
      data: result,
    });
  },
);

// get admin delivery partner report analytics controller
const getAdminSalesAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getAdminSalesAnalytics(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin vendor sales analytics fetched successfully',
    data: result,
  });
});

// get delivery partner performance analytics controller
const getDeliveryPartnerPerformanceAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getDeliveryPartnerPerformanceAnalytics(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery partner performance analytics fetched successfully',
    data: result,
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
      message:
        'Single delivery partner performance analytics fetched successfully',
      data: result,
    });
  },
);

// get customer insights controller
const getAdminCustomerInsights = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getAdminCustomerInsights(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin customer insights fetched successfully',
    data: result,
  });
});

// get platform earnings controller
const getPlatformEarnings = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getPlatformEarnings(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin platform earnings fetched successfully',
    data: result,
  });
});

// get top vendors controller
const getTopVendors = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getTopVendors(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Top vendors fetched successfully',
    data: result,
  });
});

// get peak hours controller
const getPeakHourAnalytics = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getPeakHourAnalytics(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Peak hour fetched successfully',
    data: result,
  });
});

// get delivery insights controller
const getDeliveryInsights = catchAsync(async (req, res) => {
  const result = await AnalyticsServices.getDeliveryInsights(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery insights fetched successfully',
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
