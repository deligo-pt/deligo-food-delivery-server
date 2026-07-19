/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Types } from 'mongoose';
import { Customer } from '../Customer/customer.model';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { FleetManager } from '../Fleet-Manager/fleet-manager.model';
import { Order } from '../Order/order.model';
import { Vendor } from '../Vendor/vendor.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { roundTo2 } from '../../utils/mathProvider';
import {
  OrderReportAnalyticsResponse,
  SalesAnalyticsResponse,
  TCustomerInsights,
  TDeliveryInsights,
  TDeliveryPartnerPerformance,
  TFleetPerformanceData,
  TimeframeQuery,
  TMeta,
  TPartnerMonthlyPerformance,
  TPartnerPerformanceData,
  TPartnerPerformanceDetailsData,
  TPeakHoursInsights,
  TTaxReport,
  TVendorInsights,
  TVendorSalesReport,
} from './analytics.interface';
import { Transaction } from '../Transaction/transaction.model';
import { PipelineStage } from 'mongoose';
import {
  generateEmptyBuckets,
  getGroupingPipeline,
  getReportTimeframe,
  mapGrowthToTimeline,
} from './analytics.utils';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { getLocalStartOfPeriod } from '../../utils/dateTimeProvider';
import { Wallet } from '../Wallet/wallet.model';

// --------------------------------------------------------------------------------------
// ----------------------- ANALYTICS SERVICES (Developer Morshed) -----------------------
// --------------------------------------------------------------------------------------

const timezone = 'Europe/Lisbon';

// get vendor sales analytics
const getVendorSalesAnalytics = async (currentUser: TCurrentUser) => {
  const vendorId = new Types.ObjectId(currentUser._id);

  const sevenDaysAgo = getLocalStartOfPeriod('today');
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [result] = await Order.aggregate([
    {
      $match: {
        vendorId,
        orderStatus: 'DELIVERED',
        isPaid: true,
        isDeleted: false,
        createdAt: { $gte: sevenDaysAgo },
      },
    },
    {
      $facet: {
        weeklySales: [
          {
            $group: {
              _id: {
                $dayOfWeek: {
                  date: '$createdAt',
                  timezone: 'Europe/Lisbon',
                },
              },
              total: {
                $sum: '$payoutSummary.vendor.earningsWithoutTax',
              },
            },
          },
        ],

        // Top selling products
        topItems: [
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              name: { $first: '$items.name' },
              sold: { $sum: '$items.itemSummary.quantity' },
            },
          },
          { $sort: { sold: -1 } },
          { $limit: 5 },
        ],

        // Total sales
        totalSales: [
          {
            $group: {
              _id: null,
              total: {
                $sum: '$payoutSummary.vendor.earningsWithoutTax',
              },
            },
          },
        ],
      },
    },
  ]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyTrend = dayNames.map((day) => ({
    day,
    total: 0,
  }));

  if (result?.weeklySales) {
    result.weeklySales.forEach((item: any) => {
      const index = item._id - 1;
      if (weeklyTrend[index]) {
        weeklyTrend[index].total = roundTo2(item.total);
      }
    });
  }

  const totalSales = result?.totalSales?.[0]?.total
    ? roundTo2(result.totalSales[0].total)
    : 0;

  // Best & slowest day
  const nonZeroDays = weeklyTrend.filter((d) => d.total > 0);

  const bestPerformingDay =
    nonZeroDays.length > 0
      ? [...nonZeroDays].sort((a, b) => b.total - a.total)[0].day
      : 'N/A';

  const slowestDay =
    nonZeroDays.length > 0
      ? [...nonZeroDays].sort((a, b) => a.total - b.total)[0].day
      : 'N/A';

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Sales Analytics' },
    data: {
      totalSales,
      bestPerformingDay,
      slowestDay,
      weeklyTrend,
      topSellingItems: (result?.topItems || []).map((item: any) => ({
        id: item._id,
        name:
          typeof item.name === 'object'
            ? item.name.en || item.name.pt || 'N/A'
            : item.name,
        sold: item.sold,
      })),
    },
  };
};

// get customer insights controller
const getCustomerInsights = async (currentUser: TCurrentUser) => {
  const vendorId = new Types.ObjectId(currentUser._id);

  const startOfToday = getLocalStartOfPeriod('today');

  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const fourteenDaysAgo = new Date(startOfToday);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [facet, customersRaw] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          vendorId,
          orderStatus: 'DELIVERED',
          isPaid: true,
          isDeleted: false,
        },
      },
      {
        $facet: {
          orderFrequency: [
            {
              $group: {
                _id: null,
                weekly: {
                  $sum: {
                    $cond: [{ $gte: ['$createdAt', sevenDaysAgo] }, 1, 0],
                  },
                },
                biweekly: {
                  $sum: {
                    $cond: [{ $gte: ['$createdAt', fourteenDaysAgo] }, 1, 0],
                  },
                },
                monthly: {
                  $sum: {
                    $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, 1, 0],
                  },
                },
              },
            },
          ],

          heatmap: [
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
              $group: {
                _id: {
                  day: {
                    $dayOfWeek: {
                      date: '$createdAt',
                      timezone: 'Europe/Lisbon',
                    },
                  },
                  hour: {
                    $hour: { date: '$createdAt', timezone: 'Europe/Lisbon' },
                  },
                },
                orders: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),

    Order.aggregate([
      {
        $match: {
          vendorId,
          orderStatus: 'DELIVERED',
          isPaid: true,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$customerId',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$payoutSummary.grandTotal' },
          firstOrderDate: { $min: '$createdAt' },
          city: { $first: '$deliveryAddress.city' },
        },
      },
    ]),
  ]);

  const rawData = facet[0] || { orderFrequency: [], heatmap: [] };
  const orderFrequencyRaw = rawData.orderFrequency?.[0] || {
    weekly: 0,
    biweekly: 0,
    monthly: 0,
  };
  const heatmapRaw = rawData.heatmap || [];

  const totalCustomers = customersRaw.length;

  const newCustomers = customersRaw.filter(
    (c: any) => c.firstOrderDate >= thirtyDaysAgo,
  ).length;

  const returningCustomers = customersRaw.filter(
    (c: any) => c.totalOrders > 1,
  ).length;

  const avgOrders =
    totalCustomers > 0
      ? (
          customersRaw.reduce((acc: number, c: any) => acc + c.totalOrders, 0) /
          totalCustomers
        ).toFixed(1)
      : '0.0';

  /** DEMOGRAPHICS */
  const cityMap: Record<string, number> = {};
  customersRaw.forEach((c: any) => {
    if (!c.city) return;
    cityMap[c.city] = (cityMap[c.city] || 0) + 1;
  });

  const demographicsRaw = Object.entries(cityMap)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  /** VALUE SEGMENTS */
  const valueRaw = customersRaw
    .map((c: any) => ({
      avgOrderValue: c.totalOrders > 0 ? c.totalSpent / c.totalOrders : 0,
      totalSpent: c.totalSpent,
    }))
    .sort((a: any, b: any) => b.totalSpent - a.totalSpent);

  const getSegmentAvg = (percent: number) => {
    if (!valueRaw.length) return '0.00';

    const limit = Math.ceil(valueRaw.length * (percent / 100));
    const segment = valueRaw.slice(0, limit);

    const sum = segment.reduce(
      (acc: number, curr: any) => acc + curr.avgOrderValue,
      0,
    );

    return roundTo2(sum / segment.length);
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatHour = (hour: number) => {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h.toString().padStart(2, '0')} ${suffix}`;
  };

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Customer insights' },
    data: {
      summaryCards: {
        totalCustomers: {
          value: totalCustomers,
          subValue: `${newCustomers} new`,
        },
        returningCustomers: {
          value: returningCustomers,
          subValue: `${avgOrders} orders/avg`,
        },
        topCity: {
          value: demographicsRaw[0]?.city || 'N/A',
          subValue:
            totalCustomers > 0
              ? `${((demographicsRaw[0]?.count / totalCustomers) * 100).toFixed(0)}% of customers`
              : '0%',
        },
        retentionRate: {
          value:
            totalCustomers > 0
              ? `${((returningCustomers / totalCustomers) * 100).toFixed(0)}%`
              : '0%',
          subValue: 'Avg. Repeat',
        },
      },

      demographics: demographicsRaw.map((d: any) => ({
        city: d.city,
        percentage:
          totalCustomers > 0
            ? `${((d.count / totalCustomers) * 100).toFixed(0)}%`
            : '0%',
      })),

      customerValue: [
        { segment: 'Top 1%', avgOrder: `€${getSegmentAvg(1)}` },
        { segment: 'Top 5%', avgOrder: `€${getSegmentAvg(5)}` },
        { segment: 'Top 10%', avgOrder: `€${getSegmentAvg(10)}` },
      ],

      orderFrequency: [
        { name: 'weekly', orders: orderFrequencyRaw.weekly || 0 },
        { name: 'biweekly', orders: orderFrequencyRaw.biweekly || 0 },
        { name: 'monthly', orders: orderFrequencyRaw.monthly || 0 },
      ],

      heatmap: heatmapRaw.map((h: any) => ({
        day: days[h._id.day - 1],
        hour: formatHour(h._id.hour),
        orderCount: h.orders,
      })),
    },
  };
};

// get order trend insights
const getOrderTrendInsights = async (currentUser: TCurrentUser) => {
  const vendorId = new Types.ObjectId(currentUser._id);

  const startOfToday = getLocalStartOfPeriod('today');

  const fourteenDaysAgo = new Date(startOfToday);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const twentyEightDaysAgo = new Date(startOfToday);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  const [facetResult] = await Order.aggregate([
    {
      $match: {
        vendorId,
        orderStatus: 'DELIVERED',
        isPaid: true,
        isDeleted: false,
        createdAt: { $gte: twentyEightDaysAgo },
      },
    },
    {
      $facet: {
        dailyVolume: [
          { $match: { createdAt: { $gte: fourteenDaysAgo } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                  timezone: 'Europe/Lisbon',
                },
              },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],

        // Growth comparison
        growthComparison: [
          {
            $group: {
              _id: {
                $cond: [
                  { $gte: ['$createdAt', fourteenDaysAgo] },
                  'current',
                  'previous',
                ],
              },
              count: { $sum: 1 },
            },
          },
        ],

        // Peak hours
        peakTimes: [
          { $match: { createdAt: { $gte: fourteenDaysAgo } } },
          {
            $group: {
              _id: { $hour: { date: '$createdAt', timezone: 'Europe/Lisbon' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 4 },
        ],

        // Category Performance
        categoryPerformance: [
          { $match: { createdAt: { $gte: fourteenDaysAgo } } },
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'products',
              localField: 'items.productId',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: '$product' },
          {
            $lookup: {
              from: 'productcategories',
              localField: 'product.category',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: '$category' },
          {
            $group: {
              _id: '$category.name',
              count: { $sum: '$items.itemSummary.quantity' },
            },
          },
          { $sort: { count: -1 } },
        ],
      },
    },
  ]);

  const facet = facetResult || {
    dailyVolume: [],
    growthComparison: [],
    peakTimes: [],
    categoryPerformance: [],
  };

  const currentCount =
    (facet.growthComparison || []).find((g: any) => g._id === 'current')
      ?.count || 0;
  const previousCount =
    (facet.growthComparison || []).find((g: any) => g._id === 'previous')
      ?.count || 0;

  let percentageChange = 0;
  let trend: 'up' | 'down' | 'neutral' = 'neutral';

  if (previousCount > 0) {
    percentageChange = ((currentCount - previousCount) / previousCount) * 100;
    trend = percentageChange >= 0 ? 'up' : 'down';
  } else if (currentCount > 0) {
    percentageChange = 100;
    trend = 'up';
  }

  const dailyVolumeTrend = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const found = (facet.dailyVolume || []).find((v: any) => v._id === dateStr);

    dailyVolumeTrend.push({
      day: `D${14 - i}`,
      date: dateStr,
      orders: found ? found.orders : 0,
    });
  }

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Order Trend Insights' },
    data: {
      summary: {
        totalOrders: currentCount,
        percentage: `${Math.abs(percentageChange).toFixed(0)}%`,
        trend,
      },

      dailyVolume: dailyVolumeTrend,

      peakOrderingTimes: (facet.peakTimes || []).map((p: any) => ({
        time:
          p._id === 0
            ? '12 AM'
            : p._id < 12
              ? `${p._id} AM`
              : p._id === 12
                ? '12 PM'
                : `${p._id - 12} PM`,
        orderCount: p.count,
      })),

      categoryGrowth: (facet.categoryPerformance || []).map((c: any) => ({
        category:
          typeof c._id === 'object'
            ? c._id.en || c._id.pt || 'Other'
            : c._id || 'Other',
        percentage:
          currentCount > 0
            ? `${((c.count / currentCount) * 100).toFixed(0)}%`
            : '0%',
      })),
    },
  };
};

// get top performing items analytics
const getTopSellingItemsAnalytics = async (currentUser: TCurrentUser) => {
  const vendorId = new Types.ObjectId(currentUser._id);

  const startOfToday = getLocalStartOfPeriod('today');

  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const fourteenDaysAgo = new Date(startOfToday);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [facetResult] = await Order.aggregate([
    {
      $match: {
        vendorId,
        orderStatus: 'DELIVERED',
        isPaid: true,
        isDeleted: false,
        createdAt: { $gte: fourteenDaysAgo },
      },
    },
    {
      $facet: {
        // total items sold (last 7 days)
        totalItemsSold: [
          { $match: { createdAt: { $gte: sevenDaysAgo } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: null,
              total: { $sum: '$items.itemSummary.quantity' },
            },
          },
        ],

        // current period (0–7 days)
        currentPeriod: [
          { $match: { createdAt: { $gte: sevenDaysAgo } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              name: { $first: '$items.name' },
              image: { $first: '$items.image' },
              sold: { $sum: '$items.itemSummary.quantity' },
            },
          },
        ],

        // previous period (7–14 days)
        previousPeriod: [
          {
            $match: {
              createdAt: {
                $gte: fourteenDaysAgo,
                $lt: sevenDaysAgo,
              },
            },
          },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              sold: { $sum: '$items.itemSummary.quantity' },
            },
          },
        ],
      },
    },
  ]);

  const facet = facetResult || {
    totalItemsSold: [],
    currentPeriod: [],
    previousPeriod: [],
  };

  const totalItemsSold = facet.totalItemsSold?.[0]?.total || 0;

  const previousMap = new Map(
    (facet.previousPeriod || []).map((p: any) => [String(p._id), p.sold]),
  );

  const topItems = (facet.currentPeriod || [])
    .map((item: any) => {
      const previousSold = (previousMap.get(String(item._id)) as number) || 0;

      let growthPercentage = 0;
      let trend: 'up' | 'down' | 'neutral' = 'neutral';

      if (previousSold > 0) {
        growthPercentage = ((item.sold - previousSold) / previousSold) * 100;

        trend =
          growthPercentage > 0
            ? 'up'
            : growthPercentage < 0
              ? 'down'
              : 'neutral';
      } else if (item.sold > 0) {
        growthPercentage = 100;
        trend = 'up';
      }

      return {
        id: item._id,
        name:
          typeof item.name === 'object'
            ? item.name.en || item.name.pt || 'N/A'
            : item.name || 'N/A',
        image: item.image || null,
        sold: item.sold,
        growthPercentage: Math.round(growthPercentage),
        trend,
      };
    })
    .sort((a: any, b: any) => b.sold - a.sold)
    .slice(0, 4);

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Top Selling Items' },
    data: {
      summary: {
        totalItemsSold,
      },
      topItems,
    },
  };
};

// admin sales report
const getAdminSalesReportAnalytics = async (
  query: TimeframeQuery,
): Promise<SalesAnalyticsResponse> => {
  const { timeframe, fromDate, toDate } = query;

  if (timeframe === 'custom' && !fromDate && !toDate) {
    throw new AppError(httpStatus.BAD_REQUEST, 'TIMEFRAME_CUSTOM_REQUIRED');
  }

  const { start, end, resolution, size } = getReportTimeframe(
    timeframe,
    fromDate,
    toDate,
  );

  const timelineMap = generateEmptyBuckets(start, end, resolution, size);

  const [analytics] = await Order.aggregate<any>([
    {
      $match: {
        isPaid: true,
        isDeleted: false,
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $facet: {
        stats: [
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: {
                  $cond: [
                    { $eq: ['$orderStatus', 'DELIVERED'] },
                    '$payoutSummary.grandTotal',
                    0,
                  ],
                },
              },
              completedOrders: {
                $sum: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, 1, 0] },
              },
              cancelledOrders: {
                $sum: { $cond: [{ $eq: ['$orderStatus', 'CANCELED'] }, 1, 0] },
              },
            },
          },
        ],

        revenueTrendRaw: [
          {
            $match: {
              orderStatus: 'DELIVERED',
            },
          },
          {
            $group: {
              _id: getGroupingPipeline(resolution, size, start),
              count: { $sum: '$payoutSummary.grandTotal' },
            },
          },
        ],
      },
    },
  ]);

  const analyticsData = analytics || { stats: [], revenueTrendRaw: [] };

  const stats = analyticsData.stats[0] ?? {
    totalRevenue: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  };

  const revenueTrend = mapGrowthToTimeline({
    growth: analyticsData.revenueTrendRaw ?? [],
    timelineMap,
    start,
    end,
    resolution,
    size,
  });

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Sales Report' },
    data: {
      stats: {
        totalRevenue: roundTo2(stats.totalRevenue),
        completedOrders: stats.completedOrders,
        cancelledOrders: stats.cancelledOrders,
        avgOrderValue:
          stats.completedOrders > 0
            ? roundTo2(stats.totalRevenue / stats.completedOrders)
            : 0.0,
      },
      revenueTrend: (revenueTrend || []).map((item) => ({
        time: item.time,
        revenue: roundTo2(item.value as number),
      })),
    },
  };
};

// admin order report
const getAdminOrderReportAnalytics = async (
  query: TimeframeQuery,
): Promise<OrderReportAnalyticsResponse> => {
  const { timeframe, fromDate, toDate } = query;

  if (timeframe === 'custom' && !fromDate && !toDate) {
    throw new AppError(httpStatus.BAD_REQUEST, 'TIMEFRAME_CUSTOM_REQUIRED');
  }

  const { start, end, resolution, size } = getReportTimeframe(
    timeframe,
    fromDate,
    toDate,
  );

  const timelineMap = generateEmptyBuckets(start, end, resolution, size);

  const [result] = await Order.aggregate<any>([
    {
      $match: {
        isDeleted: false,
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $facet: {
        stats: [
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: {
                  $cond: [
                    { $eq: ['$orderStatus', 'DELIVERED'] },
                    '$payoutSummary.grandTotal',
                    0,
                  ],
                },
              },
              totalOrders: { $sum: 1 },
            },
          },
        ],
        ordersByZone: [
          {
            $group: {
              _id: '$deliveryAddress.city',
              orders: { $sum: 1 },
            },
          },
          { $sort: { orders: -1 } },
          {
            $project: {
              label: { $ifNull: ['$_id', 'Unknown'] },
              value: '$orders',
              _id: 0,
            },
          },
        ],
        ordersTrendRaw: [
          {
            $group: {
              _id: getGroupingPipeline(resolution, size, start),
              count: { $sum: 1 },
            },
          },
        ],
        revenueTrend: [
          { $match: { orderStatus: 'DELIVERED' } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                  timezone: 'Europe/Lisbon',
                },
              },
              revenue: { $sum: '$payoutSummary.grandTotal' },
            },
          },
          { $sort: { _id: 1 } },
        ],
        zoneHeatmap: [
          {
            $group: {
              _id: {
                zone: '$deliveryAddress.city',
                hour: {
                  $hour: { date: '$createdAt', timezone: 'Europe/Lisbon' },
                },
              },
              orderCount: { $sum: 1 },
            },
          },
          { $limit: 100 },
        ],
      },
    },
  ]);

  const analyticsData = result || {
    stats: [],
    ordersByZone: [],
    ordersTrendRaw: [],
    revenueTrend: [],
    zoneHeatmap: [],
  };

  const statsData = analyticsData.stats[0] ?? {
    totalRevenue: 0,
    totalOrders: 0,
  };

  const ordersTrend = mapGrowthToTimeline({
    growth: analyticsData.ordersTrendRaw ?? [],
    timelineMap,
    start,
    end,
    resolution,
    size,
  });

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Order Report' },
    data: {
      stats: {
        totalRevenue: roundTo2(statsData.totalRevenue),
        totalOrders: statsData.totalOrders,
        avgOrderValue:
          statsData.totalOrders > 0
            ? roundTo2(statsData.totalRevenue / statsData.totalOrders)
            : 0.0,
      },

      ordersByZone: analyticsData.ordersByZone ?? [],

      ordersTrend: (ordersTrend || []).map((item) => ({
        time: item.time,
        orders: item.value as number,
      })),

      revenueTrend: (analyticsData.revenueTrend ?? []).map((d: any) => ({
        date: d._id,
        revenue: roundTo2(d.revenue),
      })),

      zoneHeatmap: (analyticsData.zoneHeatmap ?? []).map((h: any) => ({
        zone: h._id.zone || 'Unknown',
        hour: h._id.hour,
        orderCount: h.orderCount,
      })),
    },
  };
};

// admin customer report analytics
const getAdminCustomerReportAnalytics = async (
  timeframe?: string,
  fromDate?: string | Date,
  toDate?: string | Date,
) => {
  const { start, end, resolution, size } = getReportTimeframe(
    timeframe,
    fromDate,
    toDate,
  );

  const timelineMap = generateEmptyBuckets(start, end, resolution, size);

  const groupId = getGroupingPipeline(resolution, size, start);

  const growthMatch: any = { isDeleted: false };
  if (start) {
    growthMatch.createdAt = { $gte: start, $lte: end };
  }

  const [customerAnalyticsResult, orderCount, totalCustomerSpentAgg] =
    await Promise.all([
      Customer.aggregate([
        {
          $facet: {
            stats: [
              { $match: { isDeleted: false } },
              {
                $group: {
                  _id: null,
                  totalCustomers: { $sum: 1 },
                  activeCustomers: {
                    $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] },
                  },
                },
              },
            ],
            growth: [
              { $match: growthMatch },
              { $group: { _id: groupId, count: { $sum: 1 } } },
              {
                $sort: {
                  '_id.year': 1,
                  '_id.month': 1,
                  '_id.day': 1,
                  '_id.bucket': 1,
                },
              },
            ],
            statusStats: [
              { $match: { isDeleted: false } },
              { $group: { _id: '$status', count: { $sum: 1 } } },
            ],
          },
        },
      ]),

      Order.countDocuments({ isDeleted: false }),

      Order.aggregate([
        {
          $match: {
            orderStatus: 'DELIVERED',
            isPaid: true,
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$payoutSummary.grandTotal' },
          },
        },
      ]),
    ]);

  const analytics = customerAnalyticsResult[0] || {
    stats: [],
    growth: [],
    statusStats: [],
  };

  const rawStats = analytics.stats[0] || {
    totalCustomers: 0,
    activeCustomers: 0,
  };
  const statusStatsList = analytics.statusStats || [];

  const customerGrowth = mapGrowthToTimeline({
    growth: analytics.growth || [],
    timelineMap,
    start,
    end,
    resolution,
    size,
  }).map((item) => ({
    label: item.time,
    value: item.value,
  }));

  const totalSpent = totalCustomerSpentAgg[0]?.totalSpent || 0;

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Customer Report' },
    data: {
      stats: {
        totalCustomers: rawStats.totalCustomers || 0,
        activeCustomers: rawStats.activeCustomers || 0,
        totalSpent: roundTo2(totalSpent),
        totalOrders: orderCount,
      },

      customerGrowth,

      statusDistribution: {
        active:
          statusStatsList.find((s: any) => s._id === 'APPROVED')?.count || 0,
        blocked:
          statusStatsList.find((s: any) => s._id === 'BLOCKED')?.count || 0,
        pending:
          statusStatsList.find((s: any) => s._id === 'PENDING')?.count || 0,
      },
    },
  };
};

// admin vendor report analytics
const getAdminVendorReportAnalytics = async (
  timeframe?: string,
  fromDate?: string | Date,
  toDate?: string | Date,
) => {
  const { start, end, resolution, size } = getReportTimeframe(
    timeframe,
    fromDate,
    toDate,
  );

  const timelineMap = generateEmptyBuckets(start, end, resolution, size);
  const groupId = getGroupingPipeline(resolution, size, start);

  const growthMatch: any = { isDeleted: false };
  if (start) {
    growthMatch.createdAt = { $gte: start, $lte: end };
  }

  const [analyticsResult] = await Vendor.aggregate([
    {
      $facet: {
        statusStats: [
          { $match: { isDeleted: false } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],

        growth: [
          { $match: growthMatch },
          { $group: { _id: groupId, count: { $sum: 1 } } },
          {
            $sort: {
              '_id.year': 1,
              '_id.month': 1,
              '_id.day': 1,
              '_id.bucket': 1,
            },
          },
        ],
      },
    },
  ]);

  const analytics = analyticsResult || { statusStats: [], growth: [] };

  const getCount = (status: string) =>
    (analytics.statusStats || []).find((s: any) => s._id === status)?.count ||
    0;

  const vendorGrowths = mapGrowthToTimeline({
    growth: analytics.growth || [],
    timelineMap,
    start,
    end,
    resolution,
    size,
  }).map((item) => ({
    time: item.time,
    vendors: item.value,
  }));

  const approved = getCount('APPROVED');
  const pending = getCount('PENDING');
  const submitted = getCount('SUBMITTED');
  const rejected = getCount('REJECTED');
  const blocked = getCount('BLOCKED');

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Vendor Report' },
    data: {
      stats: {
        totalVendors: approved + pending + submitted + rejected + blocked,
        approvedVendors: approved,
        pendingVendors: pending,
        blockedVendors: blocked + rejected,
      },

      vendorGrowths,

      statusDistribution: {
        approved,
        pending,
        submitted,
        rejected,
        blocked,
      },
    },
  };
};

// admin fleet manager report analytics
const getAdminFleetManagerReportAnalytics = async (
  timeframe?: string,
  fromDate?: string | Date,
  toDate?: string | Date,
) => {
  const { start, end, resolution, size } = getReportTimeframe(
    timeframe,
    fromDate,
    toDate,
  );

  const timelineMap = generateEmptyBuckets(start, end, resolution, size);
  const groupId = getGroupingPipeline(resolution, size, start);

  const growthMatch: any = { isDeleted: false };
  if (timeframe || fromDate) {
    growthMatch.createdAt = { $gte: start, $lte: end };
  }

  const [analyticsResult, totalDriverCount, totalDeliveryCount] =
    await Promise.all([
      FleetManager.aggregate([
        {
          $facet: {
            summary: [
              { $match: { isDeleted: false } },
              {
                $group: {
                  _id: null,
                  totalManagers: { $sum: 1 },
                  approvedManagers: {
                    $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] },
                  },
                },
              },
            ],
            growth: [
              { $match: growthMatch },
              { $group: { _id: groupId, count: { $sum: 1 } } },
              {
                $sort: {
                  '_id.year': 1,
                  '_id.month': 1,
                  '_id.day': 1,
                  '_id.bucket': 1,
                },
              },
            ],
            statusStats: [
              { $match: { isDeleted: false } },
              { $group: { _id: '$status', count: { $sum: 1 } } },
            ],
          },
        },
      ]),

      DeliveryPartner.countDocuments({ isDeleted: false }),

      Order.countDocuments({ isDeleted: false, orderStatus: 'DELIVERED' }),
    ]);

  const analytics = analyticsResult[0] || {
    summary: [],
    growth: [],
    statusStats: [],
  };

  const summary = analytics.summary[0] || {
    totalManagers: 0,
    approvedManagers: 0,
  };
  const statusStatsList = analytics.statusStats || [];

  const fleetGrowths = mapGrowthToTimeline({
    growth: analytics.growth || [],
    timelineMap,
    start,
    end,
    resolution,
    size,
  }).map((item) => ({
    time: item.time,
    managers: item.value,
  }));

  const getStatusCount = (status: string) =>
    statusStatsList.find((s: any) => s._id === status)?.count || 0;

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Fleet Manager Report' },
    data: {
      stats: {
        totalManagers: summary.totalManagers || 0,
        approvedManagers: summary.approvedManagers || 0,
        totalDrivers: totalDriverCount,
        totalDeliveries: totalDeliveryCount,
      },

      fleetGrowths,

      statusDistribution: {
        approved: getStatusCount('APPROVED'),
        pending: getStatusCount('PENDING'),
        submitted: getStatusCount('SUBMITTED'),
        rejected: getStatusCount('REJECTED'),
        blocked: getStatusCount('BLOCKED'),
      },
    },
  };
};

// admin fleet manager report analytics
const getAdminDeliveryPartnerReportAnalytics = async (
  timeframe?: string,
  fromDate?: string | Date,
  toDate?: string | Date,
) => {
  const { start, end, resolution, size } = getReportTimeframe(
    timeframe,
    fromDate,
    toDate,
  );

  const timelineMap = generateEmptyBuckets(start, end, resolution, size);
  const groupId = getGroupingPipeline(resolution, size, start);

  const growthMatch: any = { isDeleted: false };
  if (start) {
    growthMatch.createdAt = { $gte: start, $lte: end };
  }

  const [analyticsResult, walletStats] = await Promise.all([
    DeliveryPartner.aggregate([
      {
        $facet: {
          summary: [
            { $match: { isDeleted: false } },
            {
              $group: {
                _id: null,
                totalPartners: { $sum: 1 },
                approvedPartners: {
                  $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] },
                },
                totalDeliveries: {
                  $sum: { $ifNull: ['$operationalData.totalDeliveries', 0] },
                },
              },
            },
          ],

          growth: [
            { $match: growthMatch },
            { $group: { _id: groupId, count: { $sum: 1 } } },
            {
              $sort: {
                '_id.year': 1,
                '_id.month': 1,
                '_id.day': 1,
                '_id.bucket': 1,
              },
            },
          ],

          vehicleStats: [
            { $match: { isDeleted: false } },
            { $group: { _id: '$vehicleInfo.vehicleType', count: { $sum: 1 } } },
          ],
        },
      },
    ]),

    Wallet.aggregate([
      { $match: { userModel: 'DeliveryPartner' } },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$lifetimeEarnings' },
        },
      },
    ]),
  ]);

  const analytics = analyticsResult[0] || {
    summary: [],
    growth: [],
    vehicleStats: [],
  };

  const summary = analytics.summary[0] || {
    totalPartners: 0,
    approvedPartners: 0,
    totalDeliveries: 0,
  };
  const vehicleStatsList = analytics.vehicleStats || [];

  const partnerGrowths = mapGrowthToTimeline({
    growth: analytics.growth || [],
    timelineMap,
    start,
    end,
    resolution,
    size,
  }).map((item) => ({
    time: item.time,
    partners: item.value,
  }));

  const getVehicleCount = (type: string) =>
    vehicleStatsList.find((v: any) => v._id === type)?.count || 0;

  const totalEarnings = walletStats[0]?.totalEarned || 0;

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Delivery Partner Report' },
    data: {
      stats: {
        totalPartners: summary.totalPartners || 0,
        approvedPartners: summary.approvedPartners || 0,
        totalDeliveries: summary.totalDeliveries || 0,
        totalEarnings: roundTo2(totalEarnings),
      },

      partnerGrowths,

      vehicleDistribution: {
        'E-BIKE': getVehicleCount('E-BIKE'),
        BICYCLE: getVehicleCount('BICYCLE'),
        SCOOTER: getVehicleCount('SCOOTER'),
        MOTORBIKE: getVehicleCount('MOTORBIKE'),
        CAR: getVehicleCount('CAR'),
      },
    },
  };
};

// vendor sales report analytics
const getVendorSalesReportAnalytics = async (
  user: TCurrentUser,
): Promise<TVendorSalesReport> => {
  const vendorId = new Types.ObjectId(user._id);

  const startOfToday = getLocalStartOfPeriod('today');
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(startOfToday.getDate() - 6);

  const [analyticsResult] = await Order.aggregate([
    {
      $match: {
        vendorId: vendorId,
        isDeleted: false,
      },
    },
    {
      $facet: {
        // --- SUMMARY STATS (Lifetime) ---
        stats: [
          {
            $group: {
              _id: null,
              totalSales: {
                $sum: {
                  $cond: [
                    { $eq: ['$orderStatus', 'DELIVERED'] },
                    '$orderCalculation.totalOriginalPrice',
                    0,
                  ],
                },
              },
              totalOrders: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              totalSales: { $round: ['$totalSales', 2] },
              totalOrders: 1,
              avgOrderValue: {
                $cond: [
                  { $eq: ['$totalOrders', 0] },
                  0,
                  { $round: [{ $divide: ['$totalSales', '$totalOrders'] }, 2] },
                ],
              },
            },
          },
        ],

        // --- SALES OVERVIEW (Last 7 Days) ---
        salesOverview: [
          { $match: { createdAt: { $gte: sevenDaysAgo } } },
          {
            $group: {
              _id: {
                $dayOfWeek: { date: '$createdAt', timezone: 'Europe/Lisbon' },
              },
              sales: { $sum: '$orderCalculation.totalOriginalPrice' },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const analytics = analyticsResult || { stats: [], salesOverview: [] };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // 3. Ensure all 7 days are represented (Refactored for safety)
  const last7DaysData = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfToday);
    d.setDate(startOfToday.getDate() - (6 - i));
    const dayName = dayNames[d.getDay()];

    // MongoDB এর $dayOfWeek ১ (Sun) থেকে ৭ (Sat) দেয়
    const mongoDayOfWeek = d.getDay() + 1;

    const dayData = (analytics.salesOverview || []).find(
      (item: any) => item._id === mongoDayOfWeek,
    );

    last7DaysData.push({
      name: dayName,
      sales: dayData ? roundTo2(dayData.sales) : 0,
      orders: dayData ? dayData.orders : 0,
    });
  }

  const stats = analytics.stats[0] || {
    totalSales: 0,
    totalOrders: 0,
    avgOrderValue: 0,
  };

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Vendor Sales Report' },
    data: {
      stats: {
        totalSales: roundTo2(stats.totalSales),
        totalOrders: stats.totalOrders,
        avgOrderValue: roundTo2(stats.avgOrderValue),
      },
      salesData: last7DaysData,
    },
  };
};

// get vendor customer report
const getVendorCustomerReport = async (
  user: TCurrentUser,
  query: Record<string, unknown>,
) => {
  const vendorId = new mongoose.Types.ObjectId(user._id);

  const startOfPeriod = getLocalStartOfPeriod('month');
  startOfPeriod.setMonth(startOfPeriod.getMonth() - 5);

  const [reportDataResult] = await Order.aggregate([
    {
      $match: {
        vendorId,
        isDeleted: false,
        paymentStatus: 'PAID',
      },
    },
    {
      $facet: {
        // --- Total Customers Count ---
        totalCountStats: [
          { $group: { _id: '$customerId' } },
          { $group: { _id: null, totalCustomers: { $sum: 1 } } },
        ],

        highestSpenderStats: [
          {
            $group: {
              _id: '$customerId',
              totalSpent: { $sum: '$payoutSummary.grandTotal' },
            },
          },
          { $sort: { totalSpent: -1 } },
          { $limit: 1 },
          {
            $lookup: {
              from: 'customers',
              localField: '_id',
              foreignField: '_id',
              as: 'customer',
            },
          },
          { $unwind: '$customer' },
          {
            $project: {
              name: {
                $cond: {
                  if: {
                    $or: [
                      { $eq: [{ $type: '$customer.name' }, 'missing'] },
                      {
                        $and: [
                          {
                            $eq: [
                              {
                                $trim: {
                                  input: {
                                    $ifNull: ['$customer.name.firstName', ''],
                                  },
                                },
                              },
                              '',
                            ],
                          },
                          {
                            $eq: [
                              {
                                $trim: {
                                  input: {
                                    $ifNull: ['$customer.name.lastName', ''],
                                  },
                                },
                              },
                              '',
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  then: {
                    $ifNull: [
                      '$customer.email',
                      { $ifNull: ['$customer.userId', 'Guest User'] },
                    ],
                  },
                  else: {
                    $concat: [
                      '$customer.name.firstName',
                      ' ',
                      '$customer.name.lastName',
                    ],
                  },
                },
              },
            },
          },
        ],

        mostOrdersStats: [
          { $group: { _id: '$customerId', orderCount: { $sum: 1 } } },
          { $sort: { orderCount: -1 } },
          { $limit: 1 },
          {
            $lookup: {
              from: 'customers',
              localField: '_id',
              foreignField: '_id',
              as: 'customer',
            },
          },
          { $unwind: '$customer' },
          {
            $project: {
              name: {
                $cond: {
                  if: {
                    $or: [
                      { $eq: [{ $type: '$customer.name' }, 'missing'] },
                      {
                        $and: [
                          {
                            $eq: [
                              {
                                $trim: {
                                  input: {
                                    $ifNull: ['$customer.name.firstName', ''],
                                  },
                                },
                              },
                              '',
                            ],
                          },
                          {
                            $eq: [
                              {
                                $trim: {
                                  input: {
                                    $ifNull: ['$customer.name.lastName', ''],
                                  },
                                },
                              },
                              '',
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  then: {
                    $ifNull: [
                      '$customer.email',
                      { $ifNull: ['$customer.userId', 'Guest User'] },
                    ],
                  },
                  else: {
                    $concat: [
                      '$customer.name.firstName',
                      ' ',
                      '$customer.name.lastName',
                    ],
                  },
                },
              },
            },
          },
        ],

        // --- Monthly Customer Growth (Last 6 Months) ---
        monthlyGrowth: [
          { $match: { createdAt: { $gte: startOfPeriod } } },
          {
            $group: {
              _id: {
                year: {
                  $year: { date: '$createdAt', timezone: 'Europe/Lisbon' },
                },
                month: {
                  $month: { date: '$createdAt', timezone: 'Europe/Lisbon' },
                },
                customer: '$customerId',
              },
            },
          },
          {
            $group: {
              _id: { year: '$_id.year', month: '$_id.month' },
              uniqueCustomers: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ],
      },
    },
  ]);

  const reportData = reportDataResult || {
    totalCountStats: [],
    highestSpenderStats: [],
    mostOrdersStats: [],
    monthlyGrowth: [],
  };

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const monthlyCustomers = [];
  const referenceDate = getLocalStartOfPeriod('month');

  for (let i = 5; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setMonth(d.getMonth() - i);

    const m = d.getMonth();
    const y = d.getFullYear();

    const found = (reportData.monthlyGrowth || []).find(
      (item: any) => item._id.month === m + 1 && item._id.year === y,
    );

    monthlyCustomers.push({
      name: monthNames[m],
      customers: found ? found.uniqueCustomers : 0,
    });
  }

  // Get Vendor Customers
  const customerIds = await Order.distinct('customerId', {
    vendorId,
    isDeleted: false,
  });

  const customerQuery = {
    ...query,
    _id: { $in: customerIds },
  };

  // Customer pagination table using QueryBuilder
  const builder = new QueryBuilder(Customer.find(), customerQuery)
    .search(['name.firstName', 'name.lastName', 'contactNumber'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await builder.countTotal();
  const customers = await builder.modelQuery;

  // Get Order Stats per Page Customer
  const stats = await Order.aggregate([
    {
      $match: {
        vendorId,
        customerId: { $in: customers.map((c) => c._id) },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$customerId',
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$payoutSummary.grandTotal' },
        lastOrder: { $max: '$createdAt' },
      },
    },
  ]);

  const statsMap = new Map(stats.map((s) => [s._id.toString(), s]));

  const customerTable = customers.map((customer: any) => {
    const stat = statsMap.get(customer._id.toString());
    return {
      ...customer.toObject(),
      orderCount: stat?.orderCount || 0,
      totalSpent: roundTo2(stat?.totalSpent || 0),
      lastOrder: stat?.lastOrder || null,
    };
  });

  const totalCustomersCount =
    reportData.totalCountStats?.[0]?.totalCustomers || 0;
  const highestSpenderName = reportData.highestSpenderStats?.[0]?.name || 'N/A';
  const mostOrdersName = reportData.mostOrdersStats?.[0]?.name || 'N/A';

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Customers' },
    data: {
      stats: {
        totalCustomers: totalCustomersCount,
        highestSpender: highestSpenderName,
        mostOrders: mostOrdersName,
      },
      monthlyCustomers,
      customers: {
        data: customerTable,
        meta,
      },
    },
  };
};

// get vendor tax report
const getVendorTaxReport = async (
  currentUser: TCurrentUser,
): Promise<TTaxReport> => {
  const vendorId = new mongoose.Types.ObjectId(currentUser._id);

  const startOfPeriod = getLocalStartOfPeriod('month');
  startOfPeriod.setMonth(startOfPeriod.getMonth() - 5);

  const [reportResult] = await Order.aggregate([
    {
      $match: {
        vendorId,
        isPaid: true,
        isDeleted: false,
        createdAt: { $gte: startOfPeriod },
      },
    },
    {
      $facet: {
        // 1. Top Level Stats (Cards)
        stats: [
          {
            $group: {
              _id: null,
              totalSales: { $sum: '$payoutSummary.vendor.vendorNetPayout' },
              totalTax: { $sum: '$payoutSummary.vendor.payableTax' },
            },
          },
          {
            $project: {
              _id: 0,
              totalSales: 1,
              totalTax: 1,
              netRevenue: { $subtract: ['$totalSales', '$totalTax'] },
            },
          },
        ],

        // 2. Product vs Addon Contribution (Donut Chart)
        taxContribution: [
          { $unwind: '$items' },
          {
            $group: {
              _id: null,
              productTax: { $sum: '$items.productPricing.taxAmount' },
              addonTax: {
                $sum: {
                  $reduce: {
                    input: '$items.addons',
                    initialValue: 0,
                    in: {
                      $add: ['$$value', { $ifNull: ['$$this.taxAmount', 0] }],
                    },
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              total: { $add: ['$productTax', '$addonTax'] },
              productTax: 1,
              addonTax: 1,
            },
          },
          {
            $project: {
              contribution: [
                {
                  name: 'Product',
                  value: {
                    $cond: [
                      { $eq: ['$total', 0] },
                      0,
                      {
                        $multiply: [
                          { $divide: ['$productTax', '$total'] },
                          100,
                        ],
                      },
                    ],
                  },
                },
                {
                  name: 'Addon',
                  value: {
                    $cond: [
                      { $eq: ['$total', 0] },
                      0,
                      {
                        $multiply: [{ $divide: ['$addonTax', '$total'] }, 100],
                      },
                    ],
                  },
                },
              ],
            },
          },
          { $unwind: '$contribution' },
          { $replaceRoot: { newRoot: '$contribution' } },
        ],

        // 3. Tax by Category (Bar Chart)
        taxByCategory: [
          { $unwind: '$items' },
          {
            $project: {
              allTaxes: {
                $concatArrays: [
                  [
                    {
                      rate: '$items.productPricing.taxRate',
                      amount: '$items.productPricing.taxAmount',
                    },
                  ],
                  {
                    $map: {
                      input: { $ifNull: ['$items.addons', []] },
                      as: 'addon',
                      in: {
                        rate: '$$addon.taxRate',
                        amount: '$$addon.taxAmount',
                      },
                    },
                  },
                ],
              },
            },
          },
          { $unwind: '$allTaxes' },
          {
            $group: {
              _id: '$allTaxes.rate',
              totalTaxAmount: { $sum: '$allTaxes.amount' },
            },
          },
          {
            $group: {
              _id: null,
              taxes: { $push: { rate: '$_id', amount: '$totalTaxAmount' } },
              grandTotalTax: { $sum: '$totalTaxAmount' },
            },
          },
          { $unwind: '$taxes' },
          {
            $project: {
              name: { $concat: [{ $toString: '$taxes.rate' }, '%'] },
              value: '$taxes.amount',
              percentage: {
                $cond: {
                  if: { $eq: ['$grandTotalTax', 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      { $divide: ['$taxes.amount', '$grandTotalTax'] },
                      100,
                    ],
                  },
                },
              },
              _id: 0,
            },
          },
          { $sort: { name: 1 } },
        ],

        // 4. Monthly Raw Data (For Trend Chart)
        monthlyRaw: [
          {
            $group: {
              _id: {
                month: {
                  $month: { date: '$createdAt', timezone: 'Europe/Lisbon' },
                },
                year: {
                  $year: { date: '$createdAt', timezone: 'Europe/Lisbon' },
                },
              },
              revenue: { $sum: '$payoutSummary.vendor.earningsWithoutTax' },
              tax: { $sum: '$payoutSummary.vendor.payableTax' },
            },
          },
        ],

        // 5. Top Tax-Generating Addons (Horizontal Bar)
        addonTax: [
          { $unwind: '$items' },
          { $unwind: '$items.addons' },
          {
            $group: {
              _id: '$items.addons.name', // Localized Object ({en, pt}) অথবা String
              tax: { $sum: '$items.addons.taxAmount' },
            },
          },
          { $sort: { tax: -1 } },
          { $limit: 5 },
          { $project: { _id: 0, name: '$_id', tax: 1 } },
        ],
      },
    },
  ]);

  const report = reportResult || {
    stats: [],
    taxContribution: [],
    taxByCategory: [],
    monthlyRaw: [],
    addonTax: [],
  };

  // --- 6 Month Continuity Logic (Timezone safe iteration) ---
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const revenueData = [];
  const referenceDate = getLocalStartOfPeriod('month');

  for (let i = 5; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setMonth(d.getMonth() - i);
    const m = d.getMonth();
    const y = d.getFullYear();

    const found = (report.monthlyRaw || []).find(
      (item: any) => item._id.month === m + 1 && item._id.year === y,
    );

    revenueData.push({
      name: monthNames[m],
      revenue: found ? roundTo2(found.revenue) : 0,
      tax: found ? roundTo2(found.tax) : 0,
    });
  }

  const stats = report.stats?.[0] || {
    totalSales: 0,
    totalTax: 0,
    netRevenue: 0,
  };

  const formattedTaxByCategory = (report.taxByCategory || []).map((c: any) => ({
    name: c.name,
    value: roundTo2(c.value),
    percentage: Number(c.percentage.toFixed(1)),
  }));

  const formattedAddonTax = (report.addonTax || []).map((a: any) => ({
    name:
      typeof a.name === 'object'
        ? a.name.en || a.name.pt || 'Other Addon'
        : a.name || 'Other Addon',
    tax: roundTo2(a.tax),
  }));

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Vendor tax report' },
    data: {
      stats: {
        totalSales: roundTo2(stats.totalSales),
        totalTax: roundTo2(stats.totalTax),
        netRevenue: roundTo2(stats.netRevenue),
      },
      taxContribution: report.taxContribution?.length
        ? report.taxContribution.map((c: any) => ({
            name: c.name,
            value: Number(c.value.toFixed(1)),
          }))
        : [
            { name: 'Product', value: 0 },
            { name: 'Addon', value: 0 },
          ],
      taxByCategory: formattedTaxByCategory,
      revenueData,
      addonTax: formattedAddonTax,
    },
  };
};

// get fleet manager performance analytics
const getFleetManagerPerformanceAnalytics = async (
  query: Record<string, unknown>,
): Promise<TFleetPerformanceData> => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const startOfToday = getLocalStartOfPeriod('today');
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const [tableAndTopResult, weeklyRawStats, globalLeaderboardStats] =
    await Promise.all([
      FleetManager.aggregate([
        { $match: { role: 'FLEET_MANAGER', isDeleted: false } },
        {
          $lookup: {
            from: 'deliverypartners',
            localField: '_id',
            foreignField: 'registeredBy.id',
            as: 'riders',
          },
        },
        {
          $lookup: {
            from: 'orders',
            let: { riderIds: '$riders._id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ['$deliveryPartnerId', '$$riderIds'] },
                      { $eq: ['$orderStatus', 'DELIVERED'] },
                      { $eq: ['$isDeleted', false] },
                    ],
                  },
                },
              },
            ],
            as: 'orders',
          },
        },
        {
          $addFields: {
            totalDeliveries: { $size: '$orders' },
            totalEarnings: { $sum: '$orders.payoutSummary.fleet.fee' },
            ratingAvg: { $ifNull: ['$rating.average', 0] },
          },
        },
        {
          $facet: {
            fleetPerformance: [
              { $sort: { totalEarnings: -1 } },
              { $skip: skip },
              { $limit: Number(limit) },
              {
                $project: {
                  _id: 1,
                  profilePhoto: 1,
                  userId: 1,
                  email: 1,
                  status: 1,
                  name: 1,
                  address: 1,
                  totalDeliveries: 1,
                  totalEarnings: 1,
                },
              },
            ],
            topFleetPerformers: [
              { $sort: { ratingAvg: -1, totalEarnings: -1 } },
              { $limit: 3 },
              {
                $project: {
                  fleetName: '$name',
                  fleetPhoto: '$profilePhoto',
                  rating: '$ratingAvg',
                  totalEarnings: 1,
                },
              },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]),

      Order.aggregate([
        {
          $match: {
            orderStatus: 'DELIVERED',
            isDeleted: false,
            createdAt: { $gte: startOfWeek },
          },
        },
        {
          $group: {
            _id: {
              $dayOfWeek: { date: '$createdAt', timezone: 'Europe/Lisbon' },
            },
            totalOrders: { $sum: 1 },
            totalEarnings: { $sum: '$payoutSummary.fleet.fee' },
          },
        },
      ]),

      FleetManager.aggregate([
        { $match: { role: 'FLEET_MANAGER', isDeleted: false } },
        {
          $lookup: {
            from: 'deliverypartners',
            localField: '_id',
            foreignField: 'registeredBy.id',
            as: 'riders',
          },
        },
        {
          $lookup: {
            from: 'orders',
            let: { riderIds: '$riders._id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ['$deliveryPartnerId', '$$riderIds'] },
                      { $eq: ['$orderStatus', 'DELIVERED'] },
                      { $eq: ['$isDeleted', false] },
                    ],
                  },
                },
              },
            ],
            as: 'orders',
          },
        },
        {
          $project: {
            name: 1,
            profilePhoto: 1,
            totalDeliveries: { $size: '$orders' },
            totalEarnings: { $sum: '$orders.payoutSummary.fleet.fee' },
            ratingAvg: { $ifNull: ['$rating.average', 0] },
          },
        },
        {
          $facet: {
            mostOrders: [{ $sort: { totalDeliveries: -1 } }, { $limit: 1 }],
            highestEarnings: [{ $sort: { totalEarnings: -1 } }, { $limit: 1 }],
            highestRating: [{ $sort: { ratingAvg: -1 } }, { $limit: 1 }],
          },
        },
      ]),
    ]);

  const result = tableAndTopResult[0] || {
    fleetPerformance: [],
    topFleetPerformers: [],
    totalCount: [],
  };
  const leaderboard = globalLeaderboardStats[0] || {
    mostOrders: [],
    highestEarnings: [],
    highestRating: [],
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyMap = new Map((weeklyRawStats || []).map((w: any) => [w._id, w]));

  const fleetWeeklyPerformance = days.map((day, index) => {
    const mongoDay = index + 1;
    const data = weeklyMap.get(mongoDay);

    return {
      day,
      totalOrders: data?.totalOrders || 0,
      totalEarnings: data ? roundTo2(data.totalEarnings) : 0,
    };
  });

  const mostOrdersFleet = leaderboard.mostOrders?.[0];
  const highestEarningsFleet = leaderboard.highestEarnings?.[0];
  const highestRatingFleet = leaderboard.highestRating?.[0];

  const formatName = (nameObj: any) => {
    if (!nameObj) return '';
    if (typeof nameObj === 'object')
      return `${nameObj.firstName || ''} ${nameObj.lastName || ''}`.trim();
    return nameObj;
  };

  const formattedFleetPerformance = (result.fleetPerformance || []).map(
    (f: any) => ({
      ...f,
      name: formatName(f.name),
      totalEarnings: roundTo2(f.totalEarnings),
    }),
  );

  const formattedTopFleetPerformers = (result.topFleetPerformers || []).map(
    (t: any) => ({
      ...t,
      fleetName: formatName(t.fleetName),
      totalEarnings: roundTo2(t.totalEarnings),
    }),
  );

  const totalItems = result.totalCount?.[0]?.count || 0;

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Fleet performance', isPlural: true },
    data: {
      fleetPerformance: formattedFleetPerformance,

      fleetPerformanceStat: {
        mostOrders: {
          fleetName: formatName(mostOrdersFleet?.name),
          fleetPhoto: mostOrdersFleet?.profilePhoto || '',
          ordersCount: mostOrdersFleet?.totalDeliveries || 0,
        },
        highestEarnings: {
          fleetName: formatName(highestEarningsFleet?.name),
          fleetPhoto: highestEarningsFleet?.profilePhoto || '',
          earnings: highestEarningsFleet
            ? roundTo2(highestEarningsFleet.totalEarnings)
            : 0,
        },
        highestRating: {
          fleetName: formatName(highestRatingFleet?.name),
          fleetPhoto: highestRatingFleet?.profilePhoto || '',
          rating: highestRatingFleet?.ratingAvg || 0,
        },
      },

      fleetWeeklyPerformance,

      topFleetPerformers: formattedTopFleetPerformers,
    },

    meta: {
      page: Number(page),
      limit: Number(limit),
      total: totalItems,
      totalPage: Math.ceil(totalItems / Number(limit)),
    },
  };
};

// get single fleet manager performance details analytics
const getSingleFleetPerformanceDetailsAnalytics = async (
  fleetManagerId: string,
) => {
  const startOfToday = getLocalStartOfPeriod('today');
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const fleetManager = await FleetManager.findOne({ userId: fleetManagerId })
    .select('_id profilePhoto userId email status name address rating')
    .lean();

  if (!fleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'FLEET_MANAGER_NOT_FOUND');
  }

  // Get Fleet Drivers
  const drivers = await DeliveryPartner.find({
    'registeredBy.id': fleetManager._id,
    isDeleted: false,
  })
    .select('_id userId name rating')
    .lean();

  const driverIds = drivers.map((d) => d._id);
  const totalDrivers = driverIds.length;

  const formatName = (nameObj: any) => {
    if (!nameObj) return 'N/A';
    if (typeof nameObj === 'object') {
      return (
        `${nameObj.firstName || ''} ${nameObj.lastName || ''}`.trim() || 'N/A'
      );
    }
    return nameObj;
  };

  const [orderStats, weeklyRaw] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          deliveryPartnerId: { $in: driverIds },
          orderStatus: 'DELIVERED',
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalDeliveries: { $sum: 1 },
          totalEarnings: { $sum: '$payoutSummary.fleet.fee' },
        },
      },
    ]),

    Order.aggregate([
      {
        $match: {
          deliveryPartnerId: { $in: driverIds },
          orderStatus: 'DELIVERED',
          isDeleted: false,
          createdAt: { $gte: startOfWeek },
        },
      },
      {
        $group: {
          _id: {
            $dayOfWeek: { date: '$createdAt', timezone: 'Europe/Lisbon' },
          },
          totalOrders: { $sum: 1 },
          totalEarnings: { $sum: '$payoutSummary.fleet.fee' },
        },
      },
    ]),
  ]);

  const stats = orderStats[0] || { totalDeliveries: 0, totalEarnings: 0 };

  const fleetPerformance = {
    ...fleetManager,
    name: formatName(fleetManager.name),
    totalDrivers,
    totalDeliveries: stats.totalDeliveries,
    totalEarnings: roundTo2(stats.totalEarnings),
  };

  // Weekly Performance mapping
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyMap = new Map((weeklyRaw || []).map((w: any) => [w._id, w]));

  const fleetWeeklyPerformance = days.map((day, index) => {
    // MongoDB $dayOfWeek: ১ (Sun) থেকে ৭ (Sat) দেয়
    const mongoDay = index + 1;
    const found = weeklyMap.get(mongoDay);

    return {
      day,
      totalOrders: found?.totalOrders || 0,
      totalEarnings: found ? roundTo2(found.totalEarnings) : 0,
    };
  });

  // Top Rated Drivers
  const topRatedDrivers = drivers
    .sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0))
    .slice(0, 4)
    .map((driver) => ({
      _id: driver._id,
      userId: driver.userId,
      name: formatName(driver.name),
      rating: driver.rating?.average || 0,
    }));

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Fleet Performance' },
    data: {
      fleetPerformance,
      fleetWeeklyPerformance,
      topRatedDrivers,
    },
  };
};

// get admin delivery partner performance analytics
const getDeliveryPartnerPerformanceAnalytics = async (
  query: Record<string, unknown>,
): Promise<{
  messageKey: TMessageKey;
  variables?: Record<string, string | number | boolean>;
  data: TPartnerPerformanceData;
  meta: TMeta;
}> => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const startOfPeriod = getLocalStartOfPeriod('month');
  startOfPeriod.setMonth(startOfPeriod.getMonth() - 5);

  const [tableResult, monthlyRawStats, globalLeaderboardStats] =
    await Promise.all([
      DeliveryPartner.aggregate([
        { $match: { isDeleted: false } },
        {
          $lookup: {
            from: 'orders',
            localField: '_id',
            foreignField: 'deliveryPartnerId',
            pipeline: [
              { $match: { orderStatus: 'DELIVERED', isDeleted: false } },
            ],
            as: 'orders',
          },
        },
        {
          $addFields: {
            totalDeliveries: { $size: '$orders' },
            totalEarnings: {
              $sum: '$orders.payoutSummary.rider.riderNetEarnings',
            },
            rating: { $ifNull: ['$rating.average', 0] },
          },
        },
        {
          $facet: {
            partnerPerformance: [
              { $sort: { totalDeliveries: -1 } },
              { $skip: skip },
              { $limit: Number(limit) },
              {
                $project: {
                  _id: 1,
                  profilePhoto: 1,
                  userId: 1,
                  email: 1,
                  status: 1,
                  name: 1,
                  address: 1,
                  operationalData: 1,
                  totalDeliveries: 1,
                  totalEarnings: 1,
                  rating: 1,
                },
              },
            ],
            topPerformers: [
              { $sort: { rating: -1, totalEarnings: -1 } },
              { $limit: 5 },
              {
                $project: {
                  name: 1,
                  rating: 1,
                  totalEarnings: 1,
                  profilePhoto: 1,
                  initials: {
                    $concat: [
                      { $substr: [{ $ifNull: ['$name.firstName', ''] }, 0, 1] },
                      { $substr: [{ $ifNull: ['$name.lastName', ''] }, 0, 1] },
                    ],
                  },
                },
              },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]),

      Order.aggregate([
        {
          $match: {
            orderStatus: 'DELIVERED',
            isDeleted: false,
            createdAt: { $gte: startOfPeriod },
          },
        },
        {
          $group: {
            _id: {
              year: {
                $year: { date: '$createdAt', timezone: 'Europe/Lisbon' },
              },
              month: {
                $month: { date: '$createdAt', timezone: 'Europe/Lisbon' },
              },
            },
            totalOrders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      DeliveryPartner.aggregate([
        { $match: { isDeleted: false } },
        {
          $lookup: {
            from: 'orders',
            localField: '_id',
            foreignField: 'deliveryPartnerId',
            pipeline: [
              { $match: { orderStatus: 'DELIVERED', isDeleted: false } },
            ],
            as: 'orders',
          },
        },
        {
          $project: {
            name: 1,
            profilePhoto: 1,
            totalDeliveries: { $size: '$orders' },
            totalEarnings: {
              $sum: '$orders.payoutSummary.rider.riderNetEarnings',
            },
            ratingAvg: { $ifNull: ['$rating.average', 0] },
          },
        },
        {
          $facet: {
            mostOrders: [{ $sort: { totalDeliveries: -1 } }, { $limit: 1 }],
            highestEarnings: [{ $sort: { totalEarnings: -1 } }, { $limit: 1 }],
            highestRated: [{ $sort: { ratingAvg: -1 } }, { $limit: 1 }],
          },
        },
      ]),
    ]);

  const data = tableResult[0] || {
    partnerPerformance: [],
    topPerformers: [],
    totalCount: [],
  };
  const leaderboard = globalLeaderboardStats[0] || {
    mostOrders: [],
    highestEarnings: [],
    highestRated: [],
  };

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const earningsPerformance: TPartnerMonthlyPerformance[] = [];
  const referenceDate = getLocalStartOfPeriod('month');

  for (let i = 5; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setMonth(d.getMonth() - i);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const found = (monthlyRawStats || []).find(
      (m: any) => m._id.month === month && m._id.year === year,
    );

    earningsPerformance.push({
      month: monthNames[d.getMonth()],
      totalOrders: found?.totalOrders || 0,
    });
  }

  const formatName = (nameObj: any) => {
    if (!nameObj) return 'N/A';
    if (typeof nameObj === 'object')
      return (
        `${nameObj.firstName || ''} ${nameObj.lastName || ''}`.trim() || 'N/A'
      );
    return nameObj;
  };

  const formattedPartnerPerformance = (data.partnerPerformance || []).map(
    (p: any) => ({
      ...p,
      name: formatName(p.name),
      totalEarnings: roundTo2(p.totalEarnings),
    }),
  );

  const formattedTopPerformers = (data.topPerformers || []).map((tp: any) => ({
    ...tp,
    name: formatName(tp.name),
    totalEarnings: roundTo2(tp.totalEarnings),
  }));

  const mostOrdersRider = leaderboard.mostOrders?.[0];
  const highestEarningsRider = leaderboard.highestEarnings?.[0];
  const highestRatedRider = leaderboard.highestRated?.[0];

  const response: TPartnerPerformanceData = {
    partnerPerformance: formattedPartnerPerformance,

    topCards: {
      mostOrders: {
        partnerName: formatName(mostOrdersRider?.name),
        partnerPhoto: mostOrdersRider?.profilePhoto || '',
        ordersCount: mostOrdersRider?.totalDeliveries || 0,
      },
      highestRated: {
        partnerName: formatName(highestRatedRider?.name),
        partnerPhoto: highestRatedRider?.profilePhoto || '',
        rating: {
          average: highestRatedRider?.ratingAvg || 0,
          totalRatings: 0,
        },
      },
      highestEarnings: {
        partnerName: formatName(highestEarningsRider?.name),
        partnerPhoto: highestEarningsRider?.profilePhoto || '',
        earnings: highestEarningsRider
          ? roundTo2(highestEarningsRider.totalEarnings)
          : 0,
      },
    },

    earningsPerformance,
    topPerformers: formattedTopPerformers,
  };

  const totalItems = data.totalCount?.[0]?.count || 0;

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Delivery Partner Performance', isPlural: true },
    data: response,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: totalItems,
      totalPage: Math.ceil(totalItems / Number(limit)),
    },
  };
};

// get admin single delivery partner performance details analytics
const getSingleDeliveryPartnerPerformanceDetailsAnalytics = async (
  partnerUserId: string,
): Promise<TPartnerPerformanceDetailsData> => {
  const startOfPeriod = getLocalStartOfPeriod('month');
  startOfPeriod.setMonth(startOfPeriod.getMonth() - 5);

  const partner = await DeliveryPartner.findOne({ userId: partnerUserId })
    .select(
      '_id profilePhoto userId email status name address operationalData rating',
    )
    .lean();

  if (!partner) {
    throw new AppError(httpStatus.NOT_FOUND, 'DELIVERY_PARTNER_NOT_FOUND');
  }

  const formatName = (nameObj: any) => {
    if (!nameObj) return 'N/A';
    if (typeof nameObj === 'object') {
      return (
        `${nameObj.firstName || ''} ${nameObj.lastName || ''}`.trim() || 'N/A'
      );
    }
    return nameObj;
  };

  const [statsResult, monthlyRaw] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          deliveryPartnerId: partner._id,
          orderStatus: 'DELIVERED',
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalDeliveries: { $sum: 1 },
          totalEarnings: { $sum: '$payoutSummary.rider.riderNetEarnings' },
        },
      },
    ]),

    Order.aggregate([
      {
        $match: {
          deliveryPartnerId: partner._id,
          orderStatus: 'DELIVERED',
          isDeleted: false,
          createdAt: { $gte: startOfPeriod },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: { date: '$createdAt', timezone: 'Europe/Lisbon' } },
            month: {
              $month: { date: '$createdAt', timezone: 'Europe/Lisbon' },
            },
          },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  const stats = statsResult[0] || { totalDeliveries: 0, totalEarnings: 0 };

  const partnerPerformance: TDeliveryPartnerPerformance = {
    ...partner,
    name: formatName(partner.name),
    totalDeliveries: stats.totalDeliveries,
    totalEarnings: roundTo2(stats.totalEarnings),
    rating: partner?.rating?.average || 0,
  };

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const partnerMonthlyPerformance: TPartnerMonthlyPerformance[] = [];
  const referenceDate = getLocalStartOfPeriod('month');

  for (let i = 5; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setMonth(d.getMonth() - i);

    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const found = (monthlyRaw || []).find(
      (m: any) => m._id.month === month && m._id.year === year,
    );

    partnerMonthlyPerformance.push({
      month: monthNames[d.getMonth()],
      totalOrders: found?.totalOrders || 0,
    });
  }

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Delivery Partner Performance' },
    data: {
      partnerPerformance,
      partnerMonthlyPerformance,
    },
  };
};

// get platform earnings api for admin
const getPlatformEarnings = async (query: Record<string, any>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Base Filter
  const baseQuery = {
    type: 'PLATFORM_COMMISSION',
    status: 'SUCCESS',
  };

  // Stats Calculations
  const now = new Date();

  const weekStart = new Date();
  weekStart.setDate(now.getDate() - 7);

  const monthStart = new Date();
  monthStart.setDate(1);

  const [
    totalPlatformCommissionAgg,
    thisWeekAgg,
    thisMonthAgg,
    totalRevenueAgg,
  ] = await Promise.all([
    Transaction.aggregate([
      { $match: baseQuery },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),

    Transaction.aggregate([
      {
        $match: {
          ...baseQuery,
          createdAt: { $gte: weekStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),

    Transaction.aggregate([
      {
        $match: {
          ...baseQuery,
          createdAt: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),

    Order.aggregate([
      {
        $match: {
          isPaid: true,
          orderStatus: 'DELIVERED',
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$payoutSummary.grandTotal' },
        },
      },
    ]),
  ]);

  const totalPlatformCommission = totalPlatformCommissionAgg?.[0]?.total || 0;

  const thisWeekCommission = thisWeekAgg?.[0]?.total || 0;

  const thisMonthCommission = thisMonthAgg?.[0]?.total || 0;

  const totalRevenue = totalRevenueAgg?.[0]?.totalRevenue || 0;

  // Monthly Commission Chart
  const monthlyCommissionsAgg = await Transaction.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        commission: { $sum: '$totalAmount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthlyCommissions = monthlyCommissionsAgg.map((m) => ({
    month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
    commission: m.commission,
  }));

  // Paginated Commission Table
  const [transactions, total] = await Promise.all([
    Transaction.find(baseQuery)
      .populate({
        path: 'orderId',
        populate: {
          path: 'customerId',
          select: 'name',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Transaction.countDocuments(baseQuery),
  ]);

  const commissions = transactions.map((txn: any) => {
    const order = txn.orderId;
    const customer = order?.customerId;

    return {
      _id: txn._id.toString(),

      customer: customer || null,

      transactionId: txn.transactionId,

      orderId: order?.orderId || null,

      amount: order?.payoutSummary?.grandTotal?.toFixed(2) || '0.00',

      platformFee:
        order?.payoutSummary?.deliGoCommission?.totalDeduction?.toFixed(2) ||
        '0.00',

      createdAt: txn.createdAt.toISOString(),
    };
  });

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Platform Earnings' },
    data: {
      stats: {
        totalRevenue,
        totalPlatformCommission,
        thisWeekCommission,
        thisMonthCommission,
      },

      monthlyCommissions,

      commissions,
    },
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

// get admin vendor sales analytics
const getAdminSalesAnalytics = async (query: any) => {
  // DATE HANDLING
  const getDaysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const from = query.fromDate ? new Date(query.fromDate) : getDaysAgo(30);
  const to = query.toDate ? new Date(query.toDate) : new Date();
  to.setHours(23, 59, 59, 999);

  // Previous period (for growth)
  const diffMs = to.getTime() - from.getTime();
  const previousFrom = new Date(from.getTime() - diffMs);

  // AGGREGATION
  const pipeline: PipelineStage[] = [
    {
      $facet: {
        // SUMMARY
        summary: [
          {
            $match: {
              isDeleted: false,
              isPaid: true,
              // createdAt: { $gte: previousFrom, $lte: to },
            },
          },
          {
            $group: {
              _id: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $and: [
                          { $gte: ['$createdAt', from] },
                          { $lte: ['$createdAt', to] },
                        ],
                      },
                      then: 'current',
                    },
                    {
                      case: {
                        $and: [
                          { $gte: ['$createdAt', previousFrom] },
                          { $lt: ['$createdAt', from] },
                        ],
                      },
                      then: 'previous',
                    },
                  ],
                  default: 'ignore',
                },
              },
              totalRevenue: {
                $sum: { $ifNull: ['$payoutSummary.grandTotal', 0] },
              },
              orderCount: { $sum: 1 },
            },
          },
          {
            $match: {
              _id: { $in: ['current', 'previous'] },
            },
          },
        ],

        // DAILY (last 7 days)
        daily: [
          {
            $match: {
              isDeleted: false,
              isPaid: true,
              createdAt: {
                $gte: new Date(to.getTime() - 6 * 86400000),
                $lte: to,
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                },
              },
              orders: { $sum: 1 },
              revenue: {
                $sum: { $ifNull: ['$payoutSummary.grandTotal', 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ],

        // WEEKLY
        weekly: [
          {
            $match: {
              isDeleted: false,
              isPaid: true,
              createdAt: { $gte: from, $lte: to },
            },
          },
          {
            $group: {
              _id: {
                $dateTrunc: {
                  date: '$createdAt',
                  unit: 'week',
                },
              },
              orders: { $sum: 1 },
              revenue: {
                $sum: { $ifNull: ['$payoutSummary.grandTotal', 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 4 },
        ],

        // MONTHLY
        monthly: [
          {
            $match: {
              isDeleted: false,
              isPaid: true,
              createdAt: { $gte: from, $lte: to },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              orders: { $sum: 1 },
              revenue: {
                $sum: { $ifNull: ['$payoutSummary.grandTotal', 0] },
              },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
          { $limit: 6 },
        ],

        // STATUS
        statusDistribution: [
          {
            $match: {
              isDeleted: false,
              createdAt: { $gte: from, $lte: to },
            },
          },
          {
            $group: {
              _id: '$orderStatus',
              count: { $sum: 1 },
            },
          },
        ],

        // PAYMENT
        paymentSplit: [
          {
            $match: {
              isDeleted: false,
              isPaid: true,
              createdAt: { $gte: from, $lte: to },
            },
          },
          {
            $group: {
              _id: '$paymentMethod',
              count: { $sum: 1 },
              revenue: {
                $sum: { $ifNull: ['$payoutSummary.grandTotal', 0] },
              },
            },
          },
        ],

        // LOCATION
        revenueByLocation: [
          {
            $match: {
              isDeleted: false,
              isPaid: true,
              createdAt: { $gte: from, $lte: to },
            },
          },
          {
            $group: {
              _id: '$deliveryAddress.city',
              revenue: {
                $sum: { $ifNull: ['$payoutSummary.grandTotal', 0] },
              },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 5 },
        ],

        // VENDOR
        revenueByVendor: [
          {
            $match: {
              isDeleted: false,
              isPaid: true,
              createdAt: { $gte: from, $lte: to },
            },
          },
          {
            $group: {
              _id: '$vendorId',
              revenue: {
                $sum: { $ifNull: ['$payoutSummary.grandTotal', 0] },
              },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'vendors',
              localField: '_id',
              foreignField: '_id',
              as: 'vendorDetails',
            },
          },
          {
            $unwind: {
              path: '$vendorDetails',
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
  ];

  const [result] = await Order.aggregate(pipeline);

  // TRANSFORM
  const current = result.summary.find((s: any) => s._id === 'current') || {
    totalRevenue: 0,
    orderCount: 0,
  };

  const previous = result.summary.find((s: any) => s._id === 'previous') || {
    totalRevenue: 0,
    orderCount: 0,
  };

  const growthRate =
    previous.totalRevenue > 0
      ? ((current.totalRevenue - previous.totalRevenue) /
          previous.totalRevenue) *
        100
      : current.totalRevenue > 0
        ? 100
        : 0;

  // DAILY
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

  const map = new Map(result.daily.map((d: any) => [d._id, d]));

  const daily = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(to);
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const found = map.get(key) as any;

    return {
      label: formatter.format(d),
      orders: found?.orders || 0,
      revenue: +roundTo2(found?.revenue || 0),
    };
  });

  // WEEKLY
  const weekly = result.weekly.map((w: any, i: number) => ({
    label: `Week ${i + 1}`,
    orders: w.orders,
    revenue: +roundTo2(w.revenue),
  }));

  // MONTHLY
  const monthly = result.monthly.map((m: any) => ({
    label: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
      new Date(m._id.year, m._id.month - 1),
    ),
    orders: m.orders,
    revenue: +roundTo2(m.revenue),
  }));

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Admin sales analytics' },
    data: {
      summary: {
        totalOrders: current.orderCount,
        totalRevenue: +roundTo2(current.totalRevenue),
        averageOrderValue:
          current.orderCount > 0
            ? +roundTo2(current.totalRevenue / current.orderCount)
            : 0,
        growthRate: growthRate,
      },
      daily,
      weekly,
      monthly,
      statusDistribution: {
        completed:
          result.statusDistribution.find((s: any) => s._id === 'DELIVERED')
            ?.count || 0,
        cancelled:
          result.statusDistribution.find((s: any) => s._id === 'CANCELED')
            ?.count || 0,
      },
      paymentSplit: result.paymentSplit.map((p: any) => ({
        method: p._id,
        count: p.count,
        revenue: +roundTo2(p.revenue),
      })),
      revenueByLocation: result.revenueByLocation.map((l: any) => ({
        location: l._id || 'Unknown',
        revenue: +roundTo2(l.revenue),
      })),
      revenueByVendor: result.revenueByVendor.map((v: any) => ({
        vendorId: v._id.toString(),
        vendorName: v.vendorDetails?.name?.firstName || 'Vendor',
        revenue: +roundTo2(v.revenue),
      })),
    },
  };
};

// get admin customer insights analytics api
const getAdminCustomerInsights = async (query: {
  fromDate?: string;
  toDate?: string;
}): Promise<TCustomerInsights> => {
  const now = new Date();
  const to = query.toDate ? new Date(query.toDate) : now;
  const from = query.fromDate
    ? new Date(query.fromDate)
    : new Date(new Date().setDate(to.getDate() - 30));

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  // Time-frames for AU and Churn
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [facet] = await Order.aggregate([
    { $match: { isDeleted: false } },
    {
      $facet: {
        customerBase: [
          {
            $group: {
              _id: '$customerId',
              totalOrders: { $sum: 1 },
              totalSpent: {
                $sum: {
                  $cond: [
                    { $eq: ['$isPaid', true] },
                    '$payoutSummary.grandTotal',
                    0,
                  ],
                },
              },
              firstOrderDate: { $min: '$createdAt' },
              lastOrderDate: { $max: '$createdAt' },
              // Count orders specifically within the user-selected range
              ordersInSelectedRange: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ['$createdAt', from] },
                        { $lte: ['$createdAt', to] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          {
            $lookup: {
              from: 'customers',
              localField: '_id',
              foreignField: '_id',
              as: 'userDetails',
            },
          },
          {
            $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true },
          },
          {
            $addFields: {
              /** NEW CUSTOMER: First order ever happened in this range */
              isNew: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$firstOrderDate', from] },
                      { $lte: ['$firstOrderDate', to] },
                    ],
                  },
                  1,
                  0,
                ],
              },
              /** RETURNING CUSTOMER: Had orders before this range AND ordered again within this range */
              isReturning: {
                $cond: [{ $gt: ['$totalOrders', 0] }, 1, 0],
              },
              /** CHURNED: Hasn't ordered in recent times */
              isChurned: {
                $cond: [
                  {
                    $and: [
                      { $gt: ['$totalOrders', 0] }, // had history
                      { $eq: ['$ordersInRange', 0] }, // inactive now
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        ],
        hourlyDistribution: [
          { $match: { createdAt: { $gte: from, $lte: to } } },
          {
            $group: {
              _id: { $hour: { date: '$createdAt', timezone: 'Asia/Dhaka' } },
              count: { $sum: 1 },
            },
          },
        ],
        activeSnapshots: [
          {
            $group: {
              _id: '$customerId',
              lastActivity: { $max: '$createdAt' },
            },
          },
          {
            $group: {
              _id: null,
              dau: {
                $sum: { $cond: [{ $gte: ['$lastActivity', oneDayAgo] }, 1, 0] },
              },
              wau: {
                $sum: {
                  $cond: [{ $gte: ['$lastActivity', sevenDaysAgo] }, 1, 0],
                },
              },
              mau: {
                $sum: {
                  $cond: [{ $gte: ['$lastActivity', thirtyDaysAgo] }, 1, 0],
                },
              },
            },
          },
        ],
      },
    },
  ]);

  const customerBase = facet.customerBase || [];
  const active = facet.activeSnapshots[0] || { dau: 0, wau: 0, mau: 0 };

  // Calculate Summary Stats
  const newCustomers = customerBase.filter((c: any) => c.isNew === 1).length;
  const returningCustomers = customerBase.filter(
    (c: any) => c.isReturning > 0,
  ).length;
  const churnedCustomers = customerBase.filter(
    (c: any) => c.isChurned === 1,
  ).length;

  // CLV should be based on Total Spent by all non-deleted customers
  const totalLifetimeRevenue = customerBase.reduce(
    (acc: number, c: any) => acc + c.totalSpent,
    0,
  );

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Customer insights' },
    data: {
      summary: {
        newCustomers,
        returningCustomers,
        churnRate:
          customerBase.length > 0
            ? Number(
                ((churnedCustomers / customerBase.length) * 100).toFixed(2),
              )
            : 0,
        averageCLV:
          customerBase.length > 0
            ? Math.round(totalLifetimeRevenue / customerBase.length)
            : 0,
      },
      activeUsers: {
        dau: active.dau,
        wau: active.wau,
        mau: active.mau,
      },
      topCustomers: customerBase
        .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
        .slice(0, 5)
        .map((c: any) => ({
          customerId: c.userDetails?.userId || 'N/A',
          name: c.userDetails
            ? `${c.userDetails.name?.firstName} ${c.userDetails.name?.lastName}`.trim()
            : 'Anonymous',
          totalSpent: Number(c.totalSpent.toFixed(2)),
          totalOrders: c.totalOrders,
        })),
      orderFrequency: [
        {
          range: '1 order',
          userCount: customerBase.filter(
            (c: any) => c.ordersInSelectedRange === 1,
          ).length,
        },
        {
          range: '2-3 orders',
          userCount: customerBase.filter(
            (c: any) =>
              c.ordersInSelectedRange >= 2 && c.ordersInSelectedRange <= 3,
          ).length,
        },
        {
          range: '4-5 orders',
          userCount: customerBase.filter(
            (c: any) =>
              c.ordersInSelectedRange >= 4 && c.ordersInSelectedRange <= 5,
          ).length,
        },
        {
          range: '5+ orders',
          userCount: customerBase.filter(
            (c: any) => c.ordersInSelectedRange > 5,
          ).length,
        },
      ],
      hourlyOrders: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        orderCount:
          facet.hourlyDistribution.find((h: any) => h._id === hour)?.count || 0,
      })),
    },
  };
};

// get top vendors for admin
const getTopVendors = async (query: {
  fromDate?: string;
  toDate?: string;
}): Promise<TVendorInsights> => {
  const now = new Date();
  const to = query.toDate ? new Date(query.toDate) : now;
  const from = query.fromDate
    ? new Date(query.fromDate)
    : new Date(new Date().setDate(to.getDate() - 30));

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const [results] = await Order.aggregate([
    // We include all statuses here to calculate cancelRate accurately
    {
      $match: {
        isDeleted: false,
        createdAt: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: '$vendorId',
        // Total orders regardless of status (for cancel rate)
        grandTotalOrders: { $sum: 1 },
        // Cancelled orders
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$orderStatus', 'CANCELED'] }, 1, 0] },
        },
        // Revenue (Only from paid/delivered)
        revenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$orderStatus', 'DELIVERED'] },
                  { $eq: ['$isPaid', true] },
                ],
              },
              '$payoutSummary.vendor.earningsWithoutTax',
              0,
            ],
          },
        },
        // Prep Time (assuming prep time is stored in order or calculated)
        avgPrepTime: { $avg: '$preparationTime' },
      },
    },
    {
      $lookup: {
        from: 'vendors',
        localField: '_id',
        foreignField: '_id',
        as: 'vendorInfo',
      },
    },
    { $unwind: '$vendorInfo' },
    {
      $project: {
        vendorId: '$vendorInfo.userId',
        vendorName: {
          $concat: [
            '$vendorInfo.name.firstName',
            ' ',
            '$vendorInfo.name.lastName',
          ],
        },
        totalOrders: '$grandTotalOrders',
        totalRevenue: { $round: ['$revenue', 2] },
        averageRating: { $ifNull: ['$vendorInfo.rating.average', 0] },
        preparationTime: { $ifNull: [{ $round: ['$avgPrepTime', 0] }, 0] }, // Default 0 mins
        cancelRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$cancelledOrders', '$grandTotalOrders'] },
                100,
              ],
            },
            1,
          ],
        },
        // Satisfaction Score: Weighted average of (1 - cancelRate) and Rating
        satisfactionScore: {
          $round: [
            {
              $add: [
                { $multiply: ['$vendorInfo.rating.average', 10] }, // 4.5 -> 45
                {
                  $multiply: [
                    {
                      $subtract: [
                        1,
                        { $divide: ['$cancelledOrders', '$grandTotalOrders'] },
                      ],
                    },
                    50,
                  ],
                }, // 0.9 -> 45
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $facet: {
        // Leaderboard (Sorted by Revenue)
        topSellingVendors: [
          { $sort: { totalRevenue: -1 } },
          { $limit: 10 },
          {
            $project: {
              vendorId: 1,
              vendorName: 1,
              totalOrders: 1,
              totalRevenue: 1,
            },
          },
        ],
        // Performance Table (Detailed)
        vendorPerformance: [{ $sort: { totalOrders: -1 } }],
        // Rating Distribution
        ratingDistribution: [
          { $project: { _id: 0, vendorName: 1, rating: '$averageRating' } },
        ],
      },
    },
  ]);

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Top vendors', isPlural: true },
    data: {
      topSellingVendors: results.topSellingVendors || [],
      vendorPerformance: results.vendorPerformance || [],
      ratingDistribution: results.ratingDistribution || [],
    },
  };
};

// get peak hourly analytics for admin
const getPeakHourAnalytics = async (query: {
  fromDate?: string;
  toDate?: string;
}): Promise<TPeakHoursInsights> => {
  const now = new Date();
  const to = query.toDate ? new Date(query.toDate) : now;
  const from = query.fromDate
    ? new Date(query.fromDate)
    : new Date(new Date().setDate(to.getDate() - 7));

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  // 1. Get real efficiency: (Total Delivered Orders / Unique Rider-Hours)
  const [efficiencyData] = await Order.aggregate([
    {
      $match: {
        orderStatus: 'DELIVERED',
        isDeleted: false,
        riderId: { $exists: true },
      },
    },
    {
      $group: {
        _id: {
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone },
          },
          hour: { $hour: { date: '$createdAt', timezone } },
          rider: '$riderId',
        },
        count: { $sum: 1 },
      },
    },
    { $group: { _id: null, avg: { $avg: '$count' } } },
  ]);

  const realEfficiency = efficiencyData?.avg || 1.5;

  // 2. Fetch Online Riders count from DeliveryPartner model
  const onlineRidersCount = await DeliveryPartner.countDocuments({
    status: 'APPROVED',
    isDeleted: false,
    'operationalData.currentStatus': { $in: ['AVAILABLE', 'BUSY'] },
  });

  // 3. Multi-faceted aggregation for performance
  const [results] = await Order.aggregate([
    {
      $match: {
        isDeleted: false,
        createdAt: { $gte: from, $lte: to },
      },
    },
    {
      $facet: {
        hourly: [
          {
            $group: {
              _id: { $hour: { date: '$createdAt', timezone } },
              orderCount: { $sum: 1 },
              activeRiderIds: { $addToSet: '$riderId' },
            },
          },
          { $sort: { _id: 1 } },
        ],

        dayWise: [
          {
            $group: {
              _id: { $isoDayOfWeek: { date: '$createdAt', timezone } },
              orderCount: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],

        heatmap: [
          {
            $group: {
              _id: {
                day: { $isoDayOfWeek: { date: '$createdAt', timezone } },
                hour: { $hour: { date: '$createdAt', timezone } },
              },
              orderCount: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const DAYS_MAP = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // 4. Map Hourly Data (Ensure 0-23 hours are represented)
  const hourlyOrders = Array.from({ length: 24 }, (_, hour) => {
    const matched = results.hourly.find((h: any) => h._id === hour);
    return {
      hour,
      orderCount: matched?.orderCount || 0,
      activeRidersInHour: matched?.activeRiderIds?.length || 0,
    };
  });

  // 5. Calculate Gap using real active riders vs total online pool
  const riderDemandGap = hourlyOrders
    .filter((h) => h.orderCount > 0)
    .map((h) => {
      // Logic: Use the count of riders who actually took orders,
      // or fall back to 80% of current online pool as a capacity baseline
      const activeRiders = Math.max(
        h.activeRidersInHour,
        Math.floor(onlineRidersCount * 0.8),
        1,
      );
      const capacity = activeRiders * realEfficiency;

      return {
        hour: h.hour,
        orders: h.orderCount,
        activeRiders: activeRiders,
        shortage:
          h.orderCount > capacity ? Math.ceil(h.orderCount - capacity) : 0,
      };
    });

  // 6. Meal Time Calculation (11-16 Lunch, 18-23 Dinner)
  const total = hourlyOrders.reduce((sum, h) => sum + h.orderCount, 0) || 1;
  const lunch = hourlyOrders
    .filter((h) => h.hour >= 11 && h.hour <= 16)
    .reduce((s, h) => s + h.orderCount, 0);
  const dinner = hourlyOrders
    .filter((h) => h.hour >= 18 && h.hour <= 23)
    .reduce((s, h) => s + h.orderCount, 0);

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Peak Hour Analytics' },
    data: {
      hourlyOrders: hourlyOrders.map(({ hour, orderCount }) => ({
        hour,
        orderCount,
      })),
      mealTimeComparison: [
        {
          type: 'LUNCH',
          orderCount: lunch,
          percentage: Number(((lunch / total) * 100).toFixed(1)),
        },
        {
          type: 'DINNER',
          orderCount: dinner,
          percentage: Number(((dinner / total) * 100).toFixed(1)),
        },
      ],
      dayWiseOrders: DAYS_MAP.map((day, i) => ({
        day,
        orderCount:
          results.dayWise.find((d: any) => d._id === i + 1)?.orderCount || 0,
      })),
      heatmap: results.heatmap.map((item: any) => ({
        day: DAYS_MAP[item._id.day - 1] || 'Unknown',
        hour: item._id.hour,
        orderCount: item.orderCount,
      })),
      riderDemandGap,
    },
  };
};

// get delivery insights analytics for admin
const getDeliveryInsights = async (query: {
  fromDate?: string;
  toDate?: string;
}): Promise<TDeliveryInsights> => {
  const to = query.toDate ? new Date(query.toDate) : new Date();
  const from = query.fromDate
    ? new Date(query.fromDate)
    : new Date(new Date().setDate(to.getDate() - 30));

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const [orderAnalytics, riderIdle] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $addFields: {
          // 1. Calculate duration ONLY if both timestamps exist
          actualMinutes: {
            $cond: [
              {
                $and: [
                  { $gt: ['$deliveredAt', null] },
                  { $gt: ['$pickedUpAt', null] },
                ],
              },
              {
                $divide: [
                  { $subtract: ['$deliveredAt', '$pickedUpAt'] },
                  60000,
                ],
              },
              null,
            ],
          },
          estMin: {
            $convert: {
              input: '$delivery.estimatedTime',
              to: 'double',
              onError: 0,
              onNull: 0,
            },
          },
          isRejected: {
            $cond: [{ $in: ['$orderStatus', ['REJECTED', 'CANCELLED']] }, 1, 0],
          },
          isSuccess: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, 1, 0] },
        },
      },
      {
        $addFields: {
          // 2. Late Logic: Success + Actual > Estimate (validating actualMinutes is not null)
          isLate: {
            $cond: [
              {
                $and: [
                  { $eq: ['$isSuccess', 1] },
                  { $gt: ['$actualMinutes', '$estMin'] },
                  { $gt: ['$estMin', 0] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                // Average only orders that actually finished (exclude "Ready for Pickup")
                avgTime: {
                  $avg: {
                    $cond: [
                      { $gt: ['$actualMinutes', 0] },
                      '$actualMinutes',
                      '$$REMOVE',
                    ],
                  },
                },
                totalOrders: { $sum: 1 },
                successOrders: { $sum: '$isSuccess' },
                lateCount: { $sum: '$isLate' },
                rejectedCount: { $sum: '$isRejected' },
              },
            },
          ],
          riderPerformance: [
            { $match: { deliveryPartnerId: { $ne: null } } },
            {
              $group: {
                _id: '$deliveryPartnerId',
                totalDeliveries: { $sum: 1 }, // Correctly counts ALL assigned orders
                successfulDeliveries: { $sum: '$isSuccess' },
                totalTime: { $sum: { $ifNull: ['$actualMinutes', 0] } },
              },
            },
            {
              $lookup: {
                from: 'deliverypartners',
                localField: '_id',
                foreignField: '_id',
                as: 'rider',
              },
            },
            { $unwind: '$rider' },
            {
              $project: {
                riderId: { $ifNull: ['$rider.userId', 'N/A'] },
                riderName: {
                  $concat: [
                    '$rider.name.firstName',
                    ' ',
                    '$rider.name.lastName',
                  ],
                },
                totalDeliveries: 1,
                successfulDeliveries: 1,
                averageTime: {
                  $round: [
                    {
                      $cond: [
                        { $gt: ['$successfulDeliveries', 0] },
                        { $divide: ['$totalTime', '$successfulDeliveries'] },
                        0,
                      ],
                    },
                    1,
                  ],
                },
              },
            },
          ],
          distanceTimeAnalysis: [
            // Only use successful orders with valid distance and time > 0
            {
              $match: {
                isSuccess: 1,
                'delivery.distance': { $gt: 0 },
                actualMinutes: { $gt: 0 },
              },
            },
            {
              $group: {
                _id: { $round: ['$delivery.distance', 0] }, // Group by nearest KM
                avgTime: { $avg: '$actualMinutes' },
              },
            },
            {
              $project: {
                distanceKm: '$_id',
                averageTime: { $round: ['$avgTime', 1] },
                _id: 0,
              },
            },
            { $sort: { distanceKm: 1 } },
          ],
          areaPerformance: [
            { $match: { isSuccess: 1, actualMinutes: { $gt: 0 } } },
            {
              $group: {
                _id: {
                  $toUpper: { $ifNull: ['$deliveryAddress.city', 'Unknown'] },
                },
                avgTime: { $avg: '$actualMinutes' },
                late: { $sum: '$isLate' },
                total: { $sum: 1 },
              },
            },
            {
              $project: {
                area: '$_id',
                averageTime: { $round: ['$avgTime', 1] },
                latePercentage: {
                  $round: [
                    { $multiply: [{ $divide: ['$late', '$total'] }, 100] },
                    1,
                  ],
                },
                _id: 0,
              },
            },
          ],
          rejectedReasons: [
            { $match: { isRejected: 1 } },
            {
              $group: {
                _id: {
                  $ifNull: ['$deliveryPartnerCancelReason', '$rejectReason'],
                },
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                reason: { $ifNull: ['$_id', 'OTHER'] },
                count: 1,
                _id: 0,
              },
            },
          ],
        },
      },
    ]),

    DeliveryPartner.aggregate([
      {
        $match: {
          isDeleted: false,
          'operationalData.isWorking': true,
          // "operationalData.lastActivityAt": { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }, // this will make only today's active riders
        },
      },
      {
        $project: {
          riderId: { $toString: '$userId' },
          riderName: { $concat: ['$name.firstName', ' ', '$name.lastName'] },
          idleTimeMinutes: {
            $round: [
              {
                $divide: [
                  {
                    $subtract: [new Date(), '$operationalData.lastActivityAt'],
                  },
                  60000,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { idleTimeMinutes: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const facet = orderAnalytics[0] || {
    summary: [],
    riderPerformance: [],
    distanceTimeAnalysis: [],
    areaPerformance: [],
    rejectedReasons: [],
  };

  const summary = facet.summary[0] || {
    avgTime: 0,
    totalOrders: 0,
    lateCount: 0,
    rejectedCount: 0,
    successOrders: 0,
  };

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Delivery insights' },
    data: {
      summary: {
        averageDeliveryTime: Number((summary.avgTime || 0).toFixed(1)),
        lateDeliveryPercentage:
          summary.successOrders > 0
            ? Number(
                ((summary.lateCount / summary.successOrders) * 100).toFixed(1),
              )
            : 0,
        rejectedDeliveryPercentage:
          summary.totalOrders > 0
            ? Number(
                ((summary.rejectedCount / summary.totalOrders) * 100).toFixed(
                  1,
                ),
              )
            : 0,
      },
      riderPerformance: facet.riderPerformance,
      distanceTimeAnalysis: facet.distanceTimeAnalysis,
      areaPerformance: facet.areaPerformance,
      riderIdleTime: riderIdle,
      rejectedReasons: facet.rejectedReasons,
    },
  };
};

export const AnalyticsServices = {
  // ----------------------------------
  // Analytics Services (Developer Morshed)
  // ----------------------------------
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
