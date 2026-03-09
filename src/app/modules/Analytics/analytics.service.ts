/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Types } from 'mongoose';
import { AuthUser } from '../../constant/user.constant';
import { Customer } from '../Customer/customer.model';
import { currentStatusOptions } from '../Delivery-Partner/delivery-partner.constant';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { FleetManager } from '../Fleet-Manager/fleet-manager.model';
import { Order } from '../Order/order.model';
import { Product } from '../Product/product.model';
import { Vendor } from '../Vendor/vendor.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TDeliveryPartner } from '../Delivery-Partner/delivery-partner.interface';
import { roundTo2 } from '../../utils/mathProvider';
import {
  DailyRevenueFacet,
  OrderReportAnalyticsResponse,
  SalesAnalyticsResponse,
  SummaryFacet,
  TDeliveryPartnerPerformance,
  TFleetPerformanceData,
  TimeframeQuery,
  TMeta,
  TPartnerMonthlyPerformance,
  TPartnerPerformanceData,
  TPartnerPerformanceDetailsData,
  TVendorSalesReport,
} from './analytics.interface';
import { Transaction } from '../Transaction/transaction.model';
import { Wallet } from '../Wallet/wallet.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

// --------------------------------------------------------------------------------------
// ----------------------- ANALYTICS SERVICES (Developer Morshed) -----------------------
// --------------------------------------------------------------------------------------

// get vendor sales analytics
const getVendorSalesAnalytics = async (currentUser: AuthUser) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const vendorId = new Types.ObjectId(currentUser._id);

  const [result] = await Order.aggregate([
    {
      // common filter for all
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
        // weekly sales trend
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
                $sum: '$payoutSummary.vendor.vendorNetPayout',
              },
            },
          },
        ],

        // top selling items
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

        // total sales
        totalSales: [
          {
            $group: {
              _id: null,
              total: {
                $sum: '$payoutSummary.vendor.vendorNetPayout',
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

  let totalSales = 0;

  if (result.totalSales.length > 0) {
    totalSales = roundTo2(result.totalSales[0].total);
  }

  result.weeklySales.forEach((item: any) => {
    const index = item._id - 1;
    weeklyTrend[index].total = roundTo2(item.total);
  });

  // for Best & Slowest day
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
    totalSales: roundTo2(totalSales),
    bestPerformingDay,
    slowestDay,
    weeklyTrend,
    topSellingItems: result.topItems.map((item: any) => ({
      id: item._id,
      name: item.name,
      sold: item.sold,
    })),
  };
};

// get customer insights controller
const getCustomerInsights = async (currentUser: AuthUser) => {
  const vendorId = new Types.ObjectId(currentUser._id);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [facet] = await Order.aggregate([
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
        totalSpent: { $sum: '$subtotal' },
        firstOrderDate: { $min: '$createdAt' },
        city: { $first: '$deliveryAddress.city' },
      },
    },

    {
      $facet: {
        // summary cards
        cardStats: [
          {
            $group: {
              _id: null,
              totalCustomers: { $sum: 1 },
              newCustomers: {
                $sum: {
                  $cond: [{ $gte: ['$firstOrderDate', thirtyDaysAgo] }, 1, 0],
                },
              },
              returningCustomers: {
                $sum: {
                  $cond: [{ $gt: ['$totalOrders', 1] }, 1, 0],
                },
              },
              avgOrders: { $avg: '$totalOrders' },
            },
          },
        ],

        // demographics - top cities
        demographics: [
          { $group: { _id: '$city', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],

        // customer value segmentation
        customerValueRaw: [
          {
            $project: {
              avgOrderValue: {
                $cond: [
                  { $gt: ['$totalOrders', 0] },
                  { $divide: ['$totalSpent', '$totalOrders'] },
                  0,
                ],
              },
              totalSpent: 1,
            },
          },
          { $sort: { totalSpent: -1 } },
        ],

        // retention ratio
        retentionTrend: [
          {
            $project: {
              isReturning: {
                $cond: [{ $gt: ['$totalOrders', 1] }, 1, 0],
              },
              weekIndex: {
                $floor: {
                  $divide: [
                    { $subtract: [new Date(), '$firstOrderDate'] },
                    1000 * 60 * 60 * 24 * 7,
                  ],
                },
              },
            },
          },
          {
            $group: {
              _id: '$weekIndex',
              rate: { $avg: '$isReturning' },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 4 },
        ],
        // peak order heatmap (day of week + hour)
        heatmap: [
          {
            $group: {
              _id: {
                day: {
                  $dayOfWeek: {
                    date: '$firstOrderDate',
                    timezone: 'Europe/Lisbon',
                  },
                },
                hour: {
                  $hour: {
                    date: '$firstOrderDate',
                    timezone: 'Europe/Lisbon',
                  },
                },
              },
              orders: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const cards = facet?.cardStats?.[0] || {};
  const demographicsRaw = facet?.demographics || [];
  const valueRaw = facet?.customerValueRaw || [];
  const retentionRaw = facet?.retentionTrend || [];
  const heatmapRaw = facet?.heatmap || [];
  const totalCustomers = cards.totalCustomers || 0;

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

  return {
    summaryCards: {
      totalCustomers: {
        value: totalCustomers,
        subValue: `${cards.newCustomers || 0} new`,
      },

      returningCustomers: {
        value: cards.returningCustomers || 0,
        subValue: `${(cards.avgOrders || 0).toFixed(1)} orders/avg`,
      },

      topCity: {
        value: demographicsRaw[0]?._id || 'N/A',
        subValue:
          totalCustomers > 0
            ? `${((demographicsRaw[0]?.count / totalCustomers) * 100).toFixed(
              0,
            )}% of customers`
            : '0%',
      },

      retentionRate: {
        value:
          totalCustomers > 0
            ? `${((cards.returningCustomers / totalCustomers) * 100).toFixed(
              0,
            )}%`
            : '0%',
        subValue: 'Avg. Repeat',
      },
    },

    demographics: demographicsRaw.map((d: any) => ({
      city: d._id,
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

    retentionTrend: retentionRaw.map((r: any) => ({
      week: `Week ${r._id + 1}`,
      rate: `${(r.rate * 100).toFixed(0)}%`,
    })),

    heatmap: heatmapRaw.map((h: any) => ({
      day: h._id.day,
      hour: h._id.hour,
      orderCount: h.orders,
    })),
  };
};

// get order trend insights
const getOrderTrendInsights = async (currentUser: AuthUser) => {
  const vendorId = new Types.ObjectId(currentUser._id);

  const now = new Date();
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(now.getDate() - 28);

  const [facet] = await Order.aggregate([
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
        // Data for the 14-day Bar Chart
        dailyVolume: [
          { $match: { createdAt: { $gte: fourteenDaysAgo } } },
          {
            $project: {
              dayIndex: {
                $ceil: {
                  $divide: [
                    { $subtract: ['$createdAt', fourteenDaysAgo] },
                    1000 * 60 * 60 * 24,
                  ],
                },
              },
            },
          },
          {
            $group: {
              _id: '$dayIndex',
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],

        //  growth comparison for 14 days
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
        // Peak Ordering Times
        peakTimes: [
          { $match: { createdAt: { $gte: fourteenDaysAgo } } },
          {
            $group: {
              _id: {
                $hour: { date: '$createdAt', timezone: 'Europe/Lisbon' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 4 },
        ],
        // Category Growth
        categoryPerformance: [
          { $match: { createdAt: { $gte: fourteenDaysAgo } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.name',
              count: { $sum: '$items.quantity' },
            },
          },
          { $sort: { count: -1 } },
        ],
      },
    },
  ]);

  const currentCount =
    facet.growthComparison.find((g: any) => g._id === 'current')?.count || 0;
  const previousCount =
    facet.growthComparison.find((g: any) => g._id === 'previous')?.count || 0;

  let percentageChange = 0;
  let trend: 'up' | 'down' | 'neutral' = 'neutral';

  if (previousCount > 0) {
    percentageChange = ((currentCount - previousCount) / previousCount) * 100;
    trend = percentageChange >= 0 ? 'up' : 'down';
  } else if (currentCount > 0) {
    percentageChange = 100;
    trend = 'up';
  }

  return {
    summary: {
      totalOrders: currentCount,
      percentage: `${Math.abs(percentageChange).toFixed(0)}%`,
      trend,
    },

    dailyVolume: Array.from({ length: 14 }, (_, i) => {
      const found = facet.dailyVolume.find((d: any) => d._id === i + 1);
      return {
        day: `D${i + 1}`,
        orders: found ? found.orders : 0,
      };
    }),

    peakOrderingTimes: facet.peakTimes.map((p: any) => ({
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

    categoryGrowth: facet.categoryPerformance.map((c: any) => ({
      category: c._id || 'Other',
      percentage:
        currentCount > 0
          ? `${((c.count / currentCount) * 100).toFixed(0)}%`
          : '0%',
    })),
  };
};

// get top performing items analytics
const getTopSellingItemsAnalytics = async (currentUser: AuthUser) => {
  const vendorId = new Types.ObjectId(currentUser._id);

  const now = new Date();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const [facet] = await Order.aggregate([
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
        // total items sold
        totalItemsSold: [
          { $match: { createdAt: { $gte: sevenDaysAgo } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: null,
              total: { $sum: '$items.quantity' },
            },
          },
        ],
        // current period (0–7 days)
        currentPeriod: [
          {
            $match: {
              createdAt: {
                $gte: sevenDaysAgo,
              },
            },
          },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.name',
              name: { $first: '$items.name' },
              image: { $first: '$items.image' },
              sold: { $sum: '$items.quantity' },
              rating: { $avg: '$items.rating' },
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
              _id: '$items.name',
              sold: { $sum: '$items.quantity' },
            },
          },
        ],
      },
    },
  ]);

  const totalItemsSold = facet.totalItemsSold[0]?.total || 0;

  const previousMap = new Map(
    facet.previousPeriod.map((p: any) => [String(p._id), p.sold]),
  );

  // merge current and previous data to calculate growth
  const topItems = facet.currentPeriod
    .map((item: any) => {
      const previousSold = (previousMap.get(String(item._id)) || 0) as number;

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
        name: item.name,
        image: item.image || null,
        sold: item.sold,
        rating: Number((item.rating || 0).toFixed(1)),
        growthPercentage: Math.round(growthPercentage),
        trend,
      };
    })
    .sort((a: any, b: any) => b.sold - a.sold)
    .slice(0, 4);

  return {
    summary: {
      totalItemsSold,
    },
    topItems,
  };
};

// admin sales report
const getAdminSalesReportAnalytics = async (
  query: TimeframeQuery,
): Promise<SalesAnalyticsResponse> => {
  const hasTimeframe = Boolean(query?.timeframe);
  const timeframe = query?.timeframe;

  const endDate = new Date();

  // summery date logic
  let summaryStartDate: Date | null = null;

  if (hasTimeframe) {
    const timeframeToDaysMap: Record<string, number> = {
      last7days: 7,
      last14days: 14,
      last30days: 30,
    };

    const days = timeframeToDaysMap[timeframe!];

    // Apply filter ONLY if timeframe is valid
    if (days) {
      summaryStartDate = new Date();
      summaryStartDate.setDate(endDate.getDate() - days);
    }
  }

  // CHART DATE LOGIC (ALWAYS LAST 7 DAYS)
  const chartStartDate = new Date();
  chartStartDate.setDate(endDate.getDate() - 7);

  // for this month of revenue trend
  const monthStartDate = new Date();
  monthStartDate.setDate(endDate.getDate() - 30);

  const [analytics] = await Order.aggregate<{
    summary: SummaryFacet[];
    revenueTrend: DailyRevenueFacet[];
    last30DaysRevenue: { total: number }[];
  }>([
    {
      $match: {
        isPaid: true,
        isDeleted: false,
      },
    },
    {
      $facet: {
        // summery cards
        summary: [
          ...(summaryStartDate
            ? [{ $match: { createdAt: { $gte: summaryStartDate } } }]
            : []),
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
                $sum: {
                  $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, 1, 0],
                },
              },
              cancelledOrders: {
                $sum: {
                  $cond: [{ $eq: ['$orderStatus', 'CANCELED'] }, 1, 0],
                },
              },
            },
          },
        ],

        // 7 days revenue trend data
        revenueTrend: [
          {
            $match: {
              orderStatus: 'DELIVERED',
              createdAt: { $gte: chartStartDate },
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
              revenue: { $sum: '$payoutSummary.grandTotal' },
            },
          },
          { $sort: { _id: 1 } },
        ],
        // 30 days revenue (this month card)
        last30DaysRevenue: [
          {
            $match: {
              orderStatus: 'DELIVERED',
              createdAt: { $gte: monthStartDate },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$payoutSummary.grandTotal' },
            },
          },
        ],
      },
    },
  ]);

  const summary = analytics?.summary[0] ?? {
    totalRevenue: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  };

  const revenueTrend = analytics?.revenueTrend ?? [];

  const last30DaysRevenue = analytics?.last30DaysRevenue?.[0]?.total ?? 0;

  const total7DayRevenue = revenueTrend.reduce(
    (acc, day) => acc + day.revenue,
    0,
  );

  const topEarningDay =
    revenueTrend.length > 0
      ? revenueTrend.reduce((max, d) => (d.revenue > max.revenue ? d : max))._id
      : 'N/A';

  return {
    summary: {
      totalRevenue: roundTo2(summary.totalRevenue),
      completedOrders: summary.completedOrders,
      cancelledOrders: summary.cancelledOrders,
      avgOrderValue:
        summary.completedOrders > 0
          ? roundTo2(summary.totalRevenue / summary.completedOrders)
          : 0.0,
    },

    revenueCards: {
      thisWeek: roundTo2(total7DayRevenue),
      thisMonth: roundTo2(last30DaysRevenue),
      topEarningDay,
    },

    charts: {
      revenueTrend: revenueTrend.map((d) => ({
        date: d._id,
        revenue: d.revenue,
      })),
      earningsByDay: revenueTrend.map((d) => ({
        date: d._id,
        revenue: d.revenue,
      })),
    },
  };
};

// admin order report
const getAdminOrderReportAnalytics = async (
  query: TimeframeQuery,
): Promise<OrderReportAnalyticsResponse> => {
  const now = new Date();
  const timeframe = query?.timeframe;

  let timeframeMatch: any = {};
  if (timeframe) {
    const timeframeToDaysMap: Record<string, number> = {
      last7days: 7,
      last14days: 14,
      last30days: 30,
    };
    const days = timeframeToDaysMap[timeframe!];

    if (days) {
      timeframeMatch = new Date();
      timeframeMatch.setDate(now.getDate() - days);
    }
  }

  const last10Days = new Date();
  last10Days.setDate(now.getDate() - 10);

  const last30Days = new Date();
  last30Days.setDate(now.getDate() - 30);

  const [result] = await Order.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },
    {
      $facet: {
        // summery cards
        summary: [
          ...(timeframe
            ? [{ $match: { createdAt: { $gte: timeframeMatch } } }]
            : []),
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
        // orders by zone
        ordersByZone: [
          {
            $group: {
              _id: '$deliveryAddress.city',
              orders: { $sum: 1 },
            },
          },
          { $sort: { orders: -1 } },
        ],
        // revenue trend - 10 days
        revenueTrend: [
          { $match: { createdAt: { $gte: last10Days } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                },
              },
              revenue: {
                $sum: {
                  $cond: [
                    { $eq: ['$orderStatus', 'DELIVERED'] },
                    '$payoutSummary.grandTotal',
                    0,
                  ],
                },
              },
            },
          },
          { $sort: { _id: 1 } },
        ],
        // zone heat map
        zoneHeatmap: [
          { $match: { createdAt: { $gte: last30Days } } },
          {
            $group: {
              _id: {
                zone: '$deliveryAddress.city',
                hour: {
                  $hour: {
                    date: '$createdAt',
                    timezone: 'Europe/Lisbon',
                  },
                },
              },
              orderCount: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const summary = result?.summary[0] ?? {
    totalRevenue: 0,
    totalOrders: 0,
  };

  return {
    summary: {
      totalRevenue: roundTo2(summary.totalRevenue),
      totalOrders: summary.totalOrders,
      avgOrderValue:
        summary.totalOrders > 0
          ? roundTo2(summary.totalRevenue / summary.totalOrders)
          : 0.0,
    },

    ordersByZone: result?.ordersByZone.map((z: any) => ({
      zone: z._id ?? 'Unknown',
      orders: z.orders,
    })),

    revenueTrend: result?.revenueTrend.map((d: any) => ({
      date: d._id,
      revenue: d.revenue,
    })),

    zoneHeatmap: result?.zoneHeatmap.map((h: any) => ({
      zone: h._id.zone ?? 'Unknown',
      hour: h._id.hour,
      orderCount: h.orderCount,
    })),
  };
};

// admin customer report analytics
const getAdminCustomerReportAnalytics = async () => {
  const startOf12MonthsWindow = new Date();
  startOf12MonthsWindow.setMonth(startOf12MonthsWindow.getMonth() - 11);
  startOf12MonthsWindow.setDate(1);
  startOf12MonthsWindow.setHours(0, 0, 0, 0);

  const [analytics] = await Customer.aggregate([
    { $match: { isDeleted: false } },

    {
      $facet: {
        // SUMMARY CARDS
        summary: [
          {
            $group: {
              _id: null,
              totalCustomers: { $sum: 1 },
              activeCustomers: {
                $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] },
              },
            },
          },
          {
            $lookup: {
              from: 'orders',
              pipeline: [{ $match: { isDeleted: false } }, { $count: 'count' }],
              as: 'totalOrderCount',
            },
          },
          {
            $lookup: {
              from: 'wallets',
              pipeline: [
                { $match: { userModel: 'Admin' } },
                {
                  $group: {
                    _id: null,
                    totalRev: { $sum: '$totalEarnings' },
                  },
                },
              ],
              as: 'walletStats',
            },
          },
          {
            $project: {
              totalCustomers: 1,
              activeCustomers: 1,
              totalOrders: {
                $ifNull: [{ $arrayElemAt: ['$totalOrderCount.count', 0] }, 0],
              },
              totalRevenue: {
                $ifNull: [{ $arrayElemAt: ['$walletStats.totalRev', 0] }, 0],
              },
            },
          },
        ],

        // CUSTOMER GROWTH - only 12 months
        growth: [
          {
            $match: { createdAt: { $gte: startOf12MonthsWindow } },
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              monthlyCount: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ],

        // STATUS DISTRIBUTION
        statusStats: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const summary = analytics.summary[0] || {
    totalCustomers: 0,
    activeCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
  };

  // CUMULATIVE GROWTH TRANSFORMATION
  let cumulative = 0;
  const customerGrowth = analytics.growth.map((item: any) => {
    cumulative += item.monthlyCount;
    return {
      label: new Date(item._id.year, item._id.month - 1).toLocaleString(
        'en-US',
        { month: 'short' },
      ),
      value: cumulative,
    };
  });

  return {
    cards: {
      totalCustomers: summary.totalCustomers,
      activeCustomers: summary.activeCustomers,
      totalOrders: summary.totalOrders,
      totalRevenue: `€${summary.totalRevenue.toFixed(2)}`,
    },

    customerGrowth,

    statusDistribution: {
      approved:
        analytics.statusStats.find((s: any) => s._id === 'APPROVED')?.count ||
        0,

      pending:
        analytics.statusStats.find((s: any) => s._id === 'PENDING')?.count || 0,

      blocked:
        analytics.statusStats.find((s: any) => s._id === 'BLOCKED')?.count || 0,
    },
  };
};

// admin vendor report analytics
const getAdminVendorReportAnalytics = async () => {
  const startOf12MonthsWindow = new Date();
  startOf12MonthsWindow.setMonth(startOf12MonthsWindow.getMonth() - 11);
  startOf12MonthsWindow.setDate(1);
  startOf12MonthsWindow.setHours(0, 0, 0, 0);

  const [analytics] = await Vendor.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },

    {
      $facet: {
        // SUMMARY CARDS
        summary: [
          {
            $group: {
              _id: null,
              totalVendors: { $sum: 1 },

              approvedVendors: {
                $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] },
              },

              submittedVendors: {
                $sum: { $cond: [{ $eq: ['$status', 'SUBMITTED'] }, 1, 0] },
              },

              blockedOrRejectedVendors: {
                $sum: {
                  $cond: [{ $in: ['$status', ['BLOCKED', 'REJECTED']] }, 1, 0],
                },
              },
            },
          },
        ],

        // MONTHLY SIGNUPS - only lastest 12 months
        monthlySignups: [
          {
            $match: {
              createdAt: { $gte: startOf12MonthsWindow },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ],

        // STATUS DISTRIBUTION
        statusStats: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const summary = analytics.summary[0] || {
    totalVendors: 0,
    approvedVendors: 0,
    submittedVendors: 0,
    blockedOrRejectedVendors: 0,
  };

  // MONTHLY SIGNUPS TRANSFORMATION
  const monthlySignups = analytics.monthlySignups.map((item: any) => ({
    label: new Date(item._id.year, item._id.month - 1).toLocaleString('en-US', {
      month: 'short',
    }),
    value: item.count,
  }));

  return {
    // TOP CARDS
    cards: {
      totalVendors: summary.totalVendors,
      approvedVendors: summary.approvedVendors,
      submittedVendors: summary.submittedVendors,
      blockedOrRejectedVendors: summary.blockedOrRejectedVendors,
    },

    // BAR CHART
    monthlySignups,

    // DONUT CHART
    statusDistribution: {
      approved:
        analytics.statusStats.find((s: any) => s._id === 'APPROVED')?.count ||
        0,

      pending:
        analytics.statusStats.find((s: any) => s._id === 'PENDING')?.count || 0,

      submitted:
        analytics.statusStats.find((s: any) => s._id === 'SUBMITTED')?.count ||
        0,

      rejected:
        analytics.statusStats.find((s: any) => s._id === 'REJECTED')?.count ||
        0,

      blocked:
        analytics.statusStats.find((s: any) => s._id === 'BLOCKED')?.count || 0,
    },
  };
};

// admin fleet manager report analytics
const getAdminFleetManagerReportAnalytics = async () => {
  const startOf12MonthsWindow = new Date();
  startOf12MonthsWindow.setMonth(startOf12MonthsWindow.getMonth() - 11);
  startOf12MonthsWindow.setDate(1);
  startOf12MonthsWindow.setHours(0, 0, 0, 0);

  const [analytics] = await FleetManager.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },

    {
      $facet: {
        // SUMMARY CARDS
        summary: [
          {
            $group: {
              _id: null,

              totalFleetManagers: { $sum: 1 },

              approvedFleetManagers: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0],
                },
              },

              submittedFleetManagers: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'SUBMITTED'] }, 1, 0],
                },
              },

              blockedOrRejectedFleetManagers: {
                $sum: {
                  $cond: [{ $in: ['$status', ['BLOCKED', 'REJECTED']] }, 1, 0],
                },
              },
            },
          },
        ],

        // MONTHLY SIGNUPS (LAST 12 MONTHS)
        monthlySignups: [
          {
            $match: {
              createdAt: { $gte: startOf12MonthsWindow },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ],

        // STATUS DISTRIBUTION
        statusStats: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const summary = analytics.summary[0] || {
    totalFleetManagers: 0,
    approvedFleetManagers: 0,
    totalDrivers: 0,
    totalDeliveries: 0,
  };

  const monthlySignups = analytics.monthlySignups.map((item: any) => ({
    label: new Date(item._id.year, item._id.month - 1).toLocaleString('en-US', {
      month: 'short',
    }),
    value: item.count,
  }));

  return {
    // TOP CARDS
    cards: {
      totalFleetManagers: summary.totalFleetManagers,
      approvedFleetManagers: summary.approvedFleetManagers,
      submittedFleetManagers: summary.submittedFleetManagers,
      blockedOrRejectedFleetManagers: summary.blockedOrRejectedFleetManagers,
    },

    // BAR / LINE CHART
    monthlySignups,

    // DONUT CHART
    statusDistribution: {
      approved:
        analytics.statusStats.find((s: any) => s._id === 'APPROVED')?.count ||
        0,

      pending:
        analytics.statusStats.find((s: any) => s._id === 'PENDING')?.count || 0,

      rejected:
        analytics.statusStats.find((s: any) => s._id === 'REJECTED')?.count ||
        0,

      blocked:
        analytics.statusStats.find((s: any) => s._id === 'BLOCKED')?.count || 0,
    },
  };
};

// admin fleet manager report analytics
const getAdminDeliveryPartnerReportAnalytics = async () => {
  const startOf12MonthsWindow = new Date();
  startOf12MonthsWindow.setMonth(startOf12MonthsWindow.getMonth() - 11);
  startOf12MonthsWindow.setDate(1);
  startOf12MonthsWindow.setHours(0, 0, 0, 0);

  const [analytics] = await DeliveryPartner.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },

    {
      $facet: {
        // SUMMARY CARDS
        summary: [
          {
            $group: {
              _id: null,

              totalPartners: { $sum: 1 },

              activePartners: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$status', 'APPROVED'] },
                        { $eq: ['$operationalData.isWorking', true] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              totalDeliveries: {
                $sum: {
                  $ifNull: ['$operationalData.totalDeliveries', 0],
                },
              },
            },
          },
          {
            $lookup: {
              from: 'wallets',
              pipeline: [
                { $match: { userModel: 'DeliveryPartner' } },
                {
                  $group: {
                    _id: null,
                    totalEarningsFromWallet: { $sum: '$totalEarnings' },
                  },
                },
              ],
              as: 'walletStats',
            },
          },
          {
            $project: {
              totalPartners: 1,
              activePartners: 1,
              totalDeliveries: 1,
              totalEarnings: {
                $ifNull: [
                  { $arrayElemAt: ['$walletStats.totalEarningsFromWallet', 0] },
                  0,
                ],
              },
            },
          },
        ],

        // PARTNER GROWTH (LAST 12 MONTHS)
        growth: [
          {
            $match: {
              createdAt: { $gte: startOf12MonthsWindow },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ],

        // VEHICLE TYPES
        vehicleTypes: [
          {
            $group: {
              _id: '$vehicleInfo.vehicleType',
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const summary = analytics.summary[0] || {
    totalPartners: 0,
    activePartners: 0,
    totalDeliveries: 0,
    totalEarnings: 0,
  };

  // CUMULATIVE GROWTH TRANSFORMATION
  let cumulative = 0;
  const partnerGrowth = analytics.growth.map((item: any) => {
    cumulative += item.count;
    return {
      label: new Date(item._id.year, item._id.month - 1).toLocaleString(
        'en-US',
        { month: 'short' },
      ),
      value: cumulative,
    };
  });

  return {
    // TOP CARDS
    cards: {
      totalPartners: summary.totalPartners,
      activePartners: summary.activePartners,
      totalDeliveries: summary.totalDeliveries,
      totalEarnings: `€${summary.totalEarnings.toFixed(2)}`,
    },

    // LINE CHART
    partnerGrowth,

    // VEHICLE TYPES
    vehicleTypes: {
      motorbike:
        analytics.vehicleTypes.find((v: any) => v._id === 'MOTORBIKE')?.count ||
        0,
      eBike:
        analytics.vehicleTypes.find((v: any) => v._id === 'E-BIKE')?.count || 0,
      scooter:
        analytics.vehicleTypes.find((v: any) => v._id === 'SCOOTER')?.count ||
        0,
      bicycle:
        analytics.vehicleTypes.find((v: any) => v._id === 'BICYCLE')?.count ||
        0,
      car: analytics.vehicleTypes.find((v: any) => v._id === 'CAR')?.count || 0,
    },
  };
};

// vendor sales report analytics
const getVendorSalesReportAnalytics = async (
  user: AuthUser,
): Promise<TVendorSalesReport> => {
  const vendorId = user._id;

  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [analytics] = await Order.aggregate([
    {
      $match: {
        vendorId: vendorId,
        isDeleted: false,
      },
    },
    {
      $facet: {
        // --- SUMMARY STATS (Top Cards) ---
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
          {
            $match: {
              createdAt: { $gte: sevenDaysAgo },
            },
          },
          {
            $group: {
              _id: { $dayOfWeek: '$createdAt' },
              sales: { $sum: '$orderCalculation.totalOriginalPrice' },
              orders: { $sum: 1 },
              date: { $first: '$createdAt' },
            },
          },
          { $sort: { date: 1 } },
        ],
      },
    },
  ]);

  // 2. Prepare the 7-day name mapping
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // 3. Ensure all 7 days are represented
  const last7DaysData = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const dayName = dayNames[d.getDay()];

    const dayData = analytics.salesOverview.find((item: any) => {
      return item._id === d.getDay() + 1;
    });

    last7DaysData.push({
      name: dayName,
      sales: dayData ? Math.round(dayData.sales * 100) / 100 : 0,
      orders: dayData ? dayData.orders : 0,
    });
  }

  const stats = analytics.stats[0] || {
    totalSales: 0,
    totalOrders: 0,
    avgOrderValue: 0,
  };

  return {
    stats,
    salesData: last7DaysData,
  };
};

// get vendor customer report
const getVendorCustomerReport = async (
  user: AuthUser,
  query: Record<string, unknown>,
) => {
  const vendorId = new mongoose.Types.ObjectId(user._id);
  const now = new Date();

  // Calculate date for 6 months ago
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  // 1. Aggregation for Stats and Monthly Growth
  const [reportData] = await Order.aggregate([
    {
      $match: {
        vendorId,
        isDeleted: false,
        paymentStatus: 'PAID',
      },
    },
    {
      $facet: {
        // --- Summary Stats ---
        stats: [
          {
            $group: {
              _id: '$customerId',
              totalSpent: { $sum: '$payoutSummary.grandTotal' },
              orderCount: { $sum: 1 },
            },
          },
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
            $group: {
              _id: null,
              totalCustomers: { $sum: 1 },
              allCustomers: {
                $push: {
                  name: {
                    $concat: [
                      '$customer.name.firstName',
                      ' ',
                      '$customer.name.lastName',
                    ],
                  },
                  totalSpent: '$totalSpent',
                  orderCount: '$orderCount',
                },
              },
            },
          },
          {
            $project: {
              totalCustomers: 1,
              highestSpender: {
                $arrayElemAt: [
                  {
                    $sortArray: {
                      input: '$allCustomers',
                      sortBy: { totalSpent: -1 },
                    },
                  },
                  0,
                ],
              },
              mostOrders: {
                $arrayElemAt: [
                  {
                    $sortArray: {
                      input: '$allCustomers',
                      sortBy: { orderCount: -1 },
                    },
                  },
                  0,
                ],
              },
            },
          },
        ],

        // --- Monthly Customer Growth (Last 6 Months) ---
        monthlyGrowth: [
          {
            $match: {
              createdAt: { $gte: sixMonthsAgo },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                customer: '$customerId',
              },
            },
          },
          {
            $group: {
              _id: {
                year: '$_id.year',
                month: '$_id.month',
              },
              uniqueCustomers: { $sum: 1 },
            },
          },
          {
            $sort: {
              '_id.year': 1,
              '_id.month': 1,
            },
          },
        ],
      },
    },
  ]);

  // 2. Prepare Monthly Chart Data
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

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

    const m = d.getMonth();
    const y = d.getFullYear();

    const found = reportData?.monthlyGrowth?.find(
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

  // customer table
  const builder = new QueryBuilder(Customer.find(), customerQuery)
    .search(['name.firstName', 'name.lastName', 'contactNumber'])
    .filter()
    .sort()
    .fields()
    .paginate();

  const meta = await builder.countTotal();
  const customers = await builder.modelQuery;

  // Get Order Stats per Customer
  const stats = await Order.aggregate([
    {
      $match: {
        vendorId,
        customerId: {
          $in: customers.map((c) => c._id),
        },
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
      totalSpent: stat?.totalSpent || 0,
      lastOrder: stat?.lastOrder || null,
    };
  });

  // stats formatting
  const statsData = reportData?.stats?.[0] || {
    totalCustomers: 0,
    highestSpender: { name: 'N/A' },
    mostOrders: { name: 'N/A' },
  };

  return {
    stats: {
      totalCustomers: statsData.totalCustomers,
      highestSpender: statsData.highestSpender?.name || 'N/A',
      mostOrders: statsData.mostOrders?.name || 'N/A',
    },
    monthlyCustomers,
    customers: {
      data: customerTable,
      meta,
    },
  };
};

// get fleet manager performane analytics
const getFleetManagerPerformanceAnalytics = async (
  query: Record<string, unknown>
): Promise<TFleetPerformanceData> => {

  const now = new Date();
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  const [result] = await FleetManager.aggregate([

    {
      $match: {
        role: "FLEET_MANAGER",
        isDeleted: false
      }
    },

    // riders
    {
      $lookup: {
        from: "deliverypartners",
        localField: "_id",
        foreignField: "registeredBy.id",
        as: "riders"
      }
    },

    // orders
    {
      $lookup: {
        from: "orders",
        let: { riderIds: "$riders._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$deliveryPartnerId", "$$riderIds"] },
                  { $eq: ["$orderStatus", "DELIVERED"] },
                  { $eq: ["$isDeleted", false] }
                ]
              }
            }
          }
        ],
        as: "orders"
      }
    },

    // metrics
    {
      $addFields: {
        totalDeliveries: { $size: "$orders" },
        totalEarnings: { $sum: "$orders.payoutSummary.fleet.fee" },
        fleetName: "$name",
        fleetPhoto: "$profilePhoto",
        ratingAvg: { $ifNull: ["$rating.average", 0] }
      }
    },

    {
      $facet: {

        // Fleet Table
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
              totalEarnings: 1
            }
          }
        ],

        // Stats
        stats: [
          {
            $group: {
              _id: null,

              mostOrders: {
                $max: {
                  deliveries: "$totalDeliveries",
                  name: "$fleetName",
                  photo: "$fleetPhoto"
                }
              },

              highestEarnings: {
                $max: {
                  earnings: "$totalEarnings",
                  name: "$fleetName",
                  photo: "$fleetPhoto"
                }
              },

              highestRating: {
                $max: {
                  rating: "$ratingAvg",
                  name: "$fleetName",
                  photo: "$fleetPhoto"
                }
              }
            }
          }
        ],

        // Weekly Performance
        weekly: [
          { $unwind: "$orders" },

          {
            $match: {
              "orders.createdAt": { $gte: startOfWeek }
            }
          },

          {
            $group: {
              _id: {
                $dayOfWeek: "$orders.createdAt"
              },
              totalOrders: { $sum: 1 },
              totalEarnings: { $sum: "$orders.payoutSummary.fleet.fee" }
            }
          }
        ],

        // Top Fleets
        topFleetPerformers: [
          { $sort: { ratingAvg: -1, totalEarnings: -1 } },
          { $limit: 3 },
          {
            $project: {
              fleetName: "$name",
              fleetPhoto: "$profilePhoto",
              rating: "$ratingAvg",
              totalEarnings: 1
            }
          }
        ],

        totalCount: [
          { $count: "count" }
        ]

      }
    }
  ]);

  const stats = result.stats?.[0] || {};

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const weeklyMap = new Map();

  result.weekly?.forEach((w: any) => {
    weeklyMap.set(w._id, w);
  });

  const fleetWeeklyPerformance = days.map((day, index) => {

    const mongoDay = index === 0 ? 1 : index + 1;
    const data = weeklyMap.get(mongoDay);

    return {
      day,
      totalOrders: data?.totalOrders || 0,
      totalEarnings: roundTo2(data?.totalEarnings) || 0
    };

  });

  return {

    data: {

      fleetPerformance: result.fleetPerformance,

      fleetPerformanceStat: {

        mostOrders: {
          fleetName: stats?.mostOrders?.name || "",
          fleetPhoto: stats?.mostOrders?.photo || "",
          ordersCount: stats?.mostOrders?.deliveries || 0
        },

        highestEarnings: {
          fleetName: stats?.highestEarnings?.name || "",
          fleetPhoto: stats?.highestEarnings?.photo || "",
          earnings: roundTo2(stats?.highestEarnings?.earnings) || 0
        },

        highestRating: {
          fleetName: stats?.highestRating?.name || "",
          fleetPhoto: stats?.highestRating?.photo || "",
          rating: stats?.highestRating?.rating || 0
        }
      },

      fleetWeeklyPerformance,

      topFleetPerformers: result.topFleetPerformers

    },

    meta: {
      page: Number(page),
      limit: Number(limit),
      total: result.totalCount?.[0]?.count || 0,
      totalPage: Math.ceil((result.totalCount?.[0]?.count || 0) / Number(limit))
    }

  };

};

// get single fleet manager performance details analytics
const getSingleFleetPerformanceDetailsAnalytics = async (
  fleetManagerId: string,
) => {
  const now = new Date();

  // Fleet Manager
  const fleetManager = await FleetManager.findOne({ userId: fleetManagerId })
    .select("_id profilePhoto userId email status name address rating")
    .lean();

  if (!fleetManager) {
    throw new Error('Fleet Manager not found');
  }

  // Get Fleet Drivers
  const drivers = await DeliveryPartner.find({
    "registeredBy.id": fleetManager._id,
    isDeleted: false
  })
    .select("_id userId name rating")
    .lean();

  const driverIds = drivers.map((d) => d._id);

  const totalDrivers = driverIds.length;

  // Fleet Orders + Earnings
  const [orderStats] = await Order.aggregate([
    {
      $match: {
        deliveryPartnerId: { $in: driverIds },
        orderStatus: "DELIVERED",
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalDeliveries: { $sum: 1 },
        totalEarnings: { $sum: "$payoutSummary.fleet.fee" }
      }
    }
  ]);

  const stats = orderStats || { totalDeliveries: 0, totalEarnings: 0 };

  // Fleet Performance
  const fleetPerformance = {
    ...fleetManager,
    totalDrivers,
    totalDeliveries: stats.totalDeliveries,
    totalEarnings: roundTo2(stats.totalEarnings)
  };

  // Weekly Performance (Last 7 days)
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  const weeklyRaw = await Order.aggregate([
    {
      $match: {
        deliveryPartnerId: { $in: driverIds },
        orderStatus: "DELIVERED",
        isDeleted: false,
        createdAt: { $gte: startOfWeek }
      }
    },
    {
      $group: {
        _id: { $dayOfWeek: "$createdAt" },
        totalOrders: { $sum: 1 },
        totalEarnings: { $sum: "$payoutSummary.fleet.fee" }
      }
    }
  ]);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const weeklyMap = new Map();
  weeklyRaw.forEach((w: any) => weeklyMap.set(w._id, w));

  const fleetWeeklyPerformance = days.map((day, index) => {

    const mongoDay = index === 0 ? 1 : index + 1;
    const found = weeklyMap.get(mongoDay);

    return {
      day,
      totalOrders: found?.totalOrders || 0,
      totalEarnings: roundTo2(found?.totalEarnings || 0)
    };

  });

  // Top Rated Drivers
  const topRatedDrivers = drivers
    .sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0))
    .slice(0, 4)
    .map((driver) => ({
      _id: driver._id,
      userId: driver.userId,
      name: driver.name,
      rating: driver.rating?.average || 0
    }));

  return {
    fleetPerformance,
    fleetWeeklyPerformance,
    topRatedDrivers
  };
};

// get admin vendor sales analytics
const getAdminVendorSalesAnalytics = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [result] = await Order.aggregate([
    {
      $match: {
        orderStatus: 'DELIVERED',
        isPaid: true,
        isDeleted: false,
        createdAt: { $gte: sevenDaysAgo },
      },
    },
    {
      $facet: {
        // weekly vendor earnings trend
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
                $sum: '$payoutSummary.vendor.vendorNetPayout',
              },
            },
          },
        ],

        // top selling items across all vendors
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

        // total vendor earnings
        totalSales: [
          {
            $group: {
              _id: null,
              total: {
                $sum: '$payoutSummary.vendor.vendorNetPayout',
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

  let totalSales = 0;

  if (result.totalSales.length > 0) {
    totalSales = roundTo2(result.totalSales[0].total);
  }

  result.weeklySales.forEach((item: any) => {
    const index = item._id - 1;
    weeklyTrend[index].total = roundTo2(item.total);
  });

  // Best & Slowest Day
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
    totalSales: roundTo2(totalSales),
    bestPerformingDay,
    slowestDay,
    weeklyTrend,
    topSellingItems: result.topItems.map((item: any) => ({
      id: item._id,
      name: item.name,
      sold: item.sold,
    })),
  };
};

// get admin delivery partner performance analytics
const getDeliveryPartnerPerformanceAnalytics = async (
  query: Record<string, unknown>): Promise<{
    data: TPartnerPerformanceData;
    meta: TMeta;
  }> => {

  const { page = 1, limit = 10 } = query;

  const skip = (Number(page) - 1) * Number(limit)

  const now = new Date()

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(now.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const result = await DeliveryPartner.aggregate([

    {
      $match: {
        isDeleted: false
      }
    },

    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "deliveryPartnerId",
        pipeline: [
          {
            $match: {
              orderStatus: "DELIVERED",
              isDeleted: false
            }
          }
        ],
        as: "orders"
      }
    },

    {
      $addFields: {
        totalDeliveries: { $size: "$orders" },

        totalEarnings: {
          $sum: "$orders.payoutSummary.rider.riderNetEarnings"
        },

        rating: {
          $ifNull: ["$rating.average", 0]
        }
      }
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
              rating: 1
            }
          }

        ],

        topCards: [

          {
            $group: {
              _id: null,

              mostOrders: {
                $max: {
                  ordersCount: "$totalDeliveries",
                  partnerName: "$name",
                  partnerPhoto: "$profilePhoto"
                }
              },

              highestEarnings: {
                $max: {
                  earnings: "$totalEarnings",
                  partnerName: "$name",
                  partnerPhoto: "$profilePhoto"
                }
              },

              highestRated: {
                $max: {
                  rating: "$rating",
                  partnerName: "$name",
                  partnerPhoto: "$profilePhoto"
                }
              }

            }
          }

        ],

        topPerformers: [

          { $sort: { rating: -1, totalEarnings: -1 } },

          { $limit: 5 },

          {
            $project: {
              name: 1,
              rating: 1,
              totalEarnings: "$totalEarnings",
              profilePhoto: 1,
              initials: {
                $concat: [
                  { $substr: ["$name.firstName", 0, 1] },
                  { $substr: ["$name.lastName", 0, 1] }
                ]
              }
            }
          }

        ],

        totalCount: [
          { $count: "count" }
        ]

      }

    }

  ])

  const data = result[0]

  // Monthly Earnings Performance
  const monthlyRaw = await Order.aggregate([

    {
      $match: {
        orderStatus: "DELIVERED",
        isDeleted: false,
        createdAt: { $gte: sixMonthsAgo }
      }
    },

    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        totalOrders: { $sum: 1 }
      }
    },

    { $sort: { "_id.year": 1, "_id.month": 1 } }

  ])

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const earningsPerformance: TPartnerMonthlyPerformance[] = []

  for (let i = 5; i >= 0; i--) {

    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)

    const month = d.getMonth() + 1
    const year = d.getFullYear()

    const found = monthlyRaw.find(
      (m) => m._id.month === month && m._id.year === year
    )

    earningsPerformance.push({
      month: monthNames[d.getMonth()],
      totalOrders: found?.totalOrders || 0
    })

  }

  const stats = data.topCards?.[0] || {}

  const response: TPartnerPerformanceData = {

    partnerPerformance: data.partnerPerformance,

    topCards: {
      mostOrders: {
        partnerName: stats?.mostOrders?.partnerName || "",
        partnerPhoto: stats?.mostOrders?.partnerPhoto || "",
        ordersCount: stats?.mostOrders?.ordersCount || 0
      },

      highestRated: {
        partnerName: stats?.highestRated?.partnerName || "",
        partnerPhoto: stats?.highestRated?.partnerPhoto || "",
        rating: {
          average: stats?.highestRated?.rating || 0,
          totalRatings: 0
        }
      },

      highestEarnings: {
        partnerName: stats?.highestEarnings?.partnerName || "",
        partnerPhoto: stats?.highestEarnings?.partnerPhoto || "",
        earnings: stats?.highestEarnings?.earnings || 0
      }
    },

    earningsPerformance,

    topPerformers: data.topPerformers

  }

  return {

    data: response,

    meta: {
      page: Number(page),
      limit: Number(limit),
      total: data.totalCount?.[0]?.count || 0,
      totalPage: Math.ceil((data.totalCount?.[0]?.count || 0) / Number(limit))
    }

  }

};

// get admin single delivery partner performance details analytics
const getSingleDeliveryPartnerPerformanceDetailsAnalytics = async (
  partnerUserId: string
): Promise<TPartnerPerformanceDetailsData> => {

  const now = new Date()

  // Find partner
  const partner = await DeliveryPartner.findOne({ userId: partnerUserId })
    .select(
      "_id profilePhoto userId email status name address operationalData rating"
    )
    .lean()

  if (!partner) {
    throw new Error("Delivery partner not found")
  }

  // Total Deliveries & Earnings
  const [stats] = await Order.aggregate([
    {
      $match: {
        deliveryPartnerId: partner._id,
        orderStatus: "DELIVERED",
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalDeliveries: { $sum: 1 },
        totalEarnings: {
          $sum: "$payoutSummary.rider.riderNetEarnings"
        }
      }
    }
  ])

  const partnerPerformance: TDeliveryPartnerPerformance = {
    ...partner,
    totalDeliveries: stats?.totalDeliveries || 0,
    totalEarnings: roundTo2(stats?.totalEarnings || 0),
    rating: partner?.rating?.average || 0
  }

  // Last 6 Months Performance
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(now.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const monthlyRaw = await Order.aggregate([
    {
      $match: {
        deliveryPartnerId: partner._id,
        orderStatus: "DELIVERED",
        isDeleted: false,
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        totalOrders: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ])

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ]

  const partnerMonthlyPerformance: TPartnerMonthlyPerformance[] = []

  for (let i = 5; i >= 0; i--) {

    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)

    const month = d.getMonth() + 1
    const year = d.getFullYear()

    const found = monthlyRaw.find(
      (m) => m._id.month === month && m._id.year === year
    )

    partnerMonthlyPerformance.push({
      month: monthNames[d.getMonth()],
      totalOrders: found?.totalOrders || 0
    })
  }

  return {
    partnerPerformance,
    partnerMonthlyPerformance
  }
}

// --------------------------------------------------------------------------------------
// ----------------------- ANALYTICS SERVICES (Developer Umayer) -----------------------
// --------------------------------------------------------------------------------------

// get admin dashboard analytics
const getAdminDashboardAnalytics = async () => {
  const [
    customers,
    vendors,
    fleetManagers,
    deliveryPartners,
    totalProducts,
    totalOrders,
    pendingOrders,
    completedOrders,
    canceledOrders,
  ] = await Promise.all([
    Customer.countDocuments(),
    Vendor.countDocuments(),
    FleetManager.countDocuments(),
    DeliveryPartner.countDocuments(),
    Product.countDocuments({ isDeleted: false }),
    Order.countDocuments(),
    Order.countDocuments({ orderStatus: 'PENDING' }),
    Order.countDocuments({ orderStatus: 'DELIVERED' }),
    Order.countDocuments({ orderStatus: 'CANCELED' }),
  ]);

  const popularCategories = await Order.aggregate([
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
        as: 'categoryDetails',
      },
    },
    { $unwind: '$categoryDetails' },
    {
      $group: {
        _id: '$categoryDetails._id',
        categoryName: { $first: '$categoryDetails.name' },
        total: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 1,
        name: '$categoryName',
        percentage: {
          $round: [
            { $multiply: [{ $divide: ['$total', totalOrders] }, 100] },
            2,
          ],
        },
      },
    },
  ]);

  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(3)
    .populate('customerId', 'name')
    .select('orderId orderStatus createdAt');

  const topRatedItems = await Product.aggregate([
    {
      $match: {
        isDeleted: false,
        'rating.average': { $gte: 4 },
      },
    },

    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'items.productId',
        as: 'orderData',
      },
    },

    {
      $project: {
        _id: 1,
        productId: 1,
        name: 1,
        images: 1,
        rating: { average: '$rating.average' },
        totalOrders: { $size: '$orderData' },
      },
    },

    { $sort: { 'rating.average': -1, totalOrders: -1 } },

    { $limit: 4 },
  ]);

  const topRatedDeliveryPartners = await DeliveryPartner.find({
    rating: { $gte: 4 },
  })
    .sort({ rating: -1 })
    .limit(5)
    .select('name rating completedDeliveries');

  return {
    counts: {
      customers,
      vendors,
      fleetManagers,
      deliveryPartners,
      totalProducts,
    },
    orders: {
      total: totalOrders,
      pending: pendingOrders,
      completed: completedOrders,
      canceled: canceledOrders,
    },
    popularCategories,
    recentOrders,
    topRatedItems,
    topRatedDeliveryPartners,
  };
};

// get vendor dashboard analytics
const getVendorDashboardAnalytics = async (currentUser: AuthUser) => {
  const vendorId = new Types.ObjectId(currentUser._id);

  // --------------------------------------------------
  // Get Vendor Products
  // --------------------------------------------------
  const products = await Product.find(
    { vendorId },
    '_id category rating meta.status images',
  ).populate({
    path: 'category',
    select: 'name icon',
  });

  const productIds = products.map((p) => p._id);

  // --------------------------------------------------
  // Order Counts
  // --------------------------------------------------
  const [totalOrders, pendingOrders, completedOrders, canceledOrders] =
    await Promise.all([
      Order.countDocuments({ vendorId }),
      Order.countDocuments({ vendorId, orderStatus: 'PENDING' }),
      Order.countDocuments({ vendorId, orderStatus: 'DELIVERED' }),
      Order.countDocuments({ vendorId, orderStatus: 'CANCELED' }),
    ]);

  // --------------------------------------------------
  // Popular Categories (Order-based – FIXED)
  // --------------------------------------------------
  const popularCategories =
    totalOrders === 0
      ? []
      : await Order.aggregate([
        // Vendor filter
        {
          $match: {
            vendorId,
            isDeleted: false,
          },
        },

        // Unwind items
        { $unwind: '$items' },

        // Join products to get category
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
            as: 'categoryDetails',
          },
        },
        { $unwind: '$categoryDetails' },

        // Count orders per category
        {
          $group: {
            _id: {
              categoryId: '$categoryDetails._id',
              categoryName: '$categoryDetails.name',
              orderId: '$_id',
            },
          },
        },

        {
          $group: {
            _id: '$_id.categoryId',
            categoryName: { $first: '$_id.categoryName' },
            orderCount: { $sum: 1 },
          },
        },

        // Calculate TOTAL of all category orders
        {
          $group: {
            _id: null,
            totalCategoryOrders: { $sum: '$orderCount' },
            categories: {
              $push: {
                name: '$categoryName',
                orderCount: '$orderCount',
              },
            },
          },
        },

        // Calculate percentage (SUM = 100%)
        { $unwind: '$categories' },
        {
          $project: {
            _id: 0,
            name: '$categories.name',
            totalOrders: '$categories.orderCount',
            percentage: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        '$categories.orderCount',
                        '$totalCategoryOrders',
                      ],
                    },
                    100,
                  ],
                },
                2,
              ],
            },
          },
        },

        // Top category first
        { $sort: { percentage: -1 } },
      ]);

  // --------------------------------------------------
  // Recent Orders
  // --------------------------------------------------
  const recentOrders = await Order.find({
    vendorId,
    'items.productId': { $in: productIds },
  })
    .sort({ createdAt: -1 })
    .limit(3)
    .populate('customerId', 'name')
    .select('orderId orderStatus createdAt');

  // --------------------------------------------------
  // Top Rated Items
  // --------------------------------------------------

  const topRatedItems = await Product.aggregate([
    {
      $match: {
        vendorId: new Types.ObjectId(vendorId),
        'rating.average': { $gte: 4 },
      },
    },
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'items.productId',
        as: 'orderData',
      },
    },
    {
      $project: {
        _id: 1,
        productId: 1,
        name: 1,
        images: 1,
        rating: { average: '$rating.average' },
        totalOrders: { $size: '$orderData' },
      },
    },
    { $sort: { 'rating.average': -1, totalOrders: -1 } },
    { $limit: 4 },
  ]);

  // --------------------------------------------------
  // Final Response
  // --------------------------------------------------
  return {
    products: {
      total: products.length,
      active: products.filter((p) => p.meta.status === 'ACTIVE').length,
      inactive: products.filter((p) => p.meta.status === 'INACTIVE').length,
    },
    orders: {
      total: totalOrders,
      pending: pendingOrders,
      completed: completedOrders,
      canceled: canceledOrders,
    },
    popularCategories,
    recentOrders,
    topRatedItems,
  };
};

// get fleet dashboard analytics
const getFleetDashboardAnalytics = async (currentUser: AuthUser) => {
  const managerId = new Types.ObjectId(currentUser._id);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const myPartners = await DeliveryPartner.find({
    'registeredBy.id': managerId,
    isDeleted: false,
  }).select('_id');

  const partnerIds = myPartners.map((p) => p._id);

  const [
    totalPartners,
    onlinePartners,
    deliveriesToday,
    vehicleComposition,
    statusStats,
  ] = await Promise.all([
    DeliveryPartner.countDocuments({
      'registeredBy.id': managerId,
      isDeleted: false,
    }),

    DeliveryPartner.countDocuments({
      'registeredBy.id': managerId,
      'operationalData.currentStatus': { $ne: currentStatusOptions.OFFLINE },
      isDeleted: false,
    }),

    Order.countDocuments({
      orderStatus: 'DELIVERED',
      createdAt: { $gte: startOfDay },
      deliveryPartnerId: { $in: partnerIds },
    }),

    DeliveryPartner.aggregate([
      { $match: { 'registeredBy.id': managerId, isDeleted: false } },
      { $group: { _id: '$vehicleInfo.vehicleType', count: { $sum: 1 } } },
    ]),

    DeliveryPartner.aggregate([
      { $match: { 'registeredBy.id': managerId, isDeleted: false } },
      { $group: { _id: '$operationalData.currentStatus', count: { $sum: 1 } } },
    ]),
  ]);

  const onlinePercentage =
    totalPartners > 0
      ? ((onlinePartners / totalPartners) * 100).toFixed(1)
      : '0';

  const avgDeliveries =
    totalPartners > 0 ? (deliveriesToday / totalPartners).toFixed(1) : '0';

  const waitingPartners =
    statusStats.find((s) => s._id === currentStatusOptions.IDLE)?.count || 0;

  const availabilityRate =
    onlinePartners > 0
      ? ((waitingPartners / onlinePartners) * 100).toFixed(1)
      : '0';

  let topDrivers = await DeliveryPartner.find({
    'registeredBy.id': managerId,
    isDeleted: false,
    'rating.average': { $exists: true, $gt: 0 },
  })
    .sort({ 'rating.average': -1 })
    .limit(4)
    .select(
      'name personalInfo.gender rating personalInfo.nationality operationalData.completedDeliveries vehicleInfo',
    );

  if (!topDrivers.length) {
    topDrivers = await DeliveryPartner.find({
      'registeredBy.id': managerId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .select(
        'name personalInfo.gender rating personalInfo.nationality operationalData.completedDeliveries vehicleInfo',
      );
  }

  return {
    cards: {
      totalPartners,
      onlineNow: {
        count: onlinePartners,
        percentage: `${onlinePercentage}%`,
      },
      deliveriesToday: {
        total: deliveriesToday,
        avgPerPartner: avgDeliveries,
      },
      availabilityRate: `${availabilityRate}%`,
    },
    fleetComposition: vehicleComposition.map((item) => ({
      vehicle: item._id || 'Other',
      count: item.count,
    })),
    partnerStatus: {
      onDelivery:
        statusStats.find((s) => s._id === currentStatusOptions.ON_DELIVERY)
          ?.count || 0,
      waiting: waitingPartners,
      offline:
        statusStats.find((s) => s._id === currentStatusOptions.OFFLINE)
          ?.count || 0,
    },
    topRatedDrivers: topDrivers,
  };
};

// get partner performance analytics
const getPartnerPerformanceAnalytics = async (
  currentUser: AuthUser,
  query: Record<string, unknown>,
) => {
  const managerId = new Types.ObjectId(currentUser._id);

  const timeframe = (query?.timeframe as string) || 'last30days';
  const endDate = new Date();
  const startDate = new Date();
  const days =
    timeframe === 'last30days' ? 30 : timeframe === 'last14days' ? 14 : 7;
  startDate.setDate(endDate.getDate() - days);

  const myPartners = await DeliveryPartner.find({
    'registeredBy.id': managerId,
    isDeleted: false,
  }).select('_id');
  const partnerIds = myPartners.map((p) => p._id);

  const sortMapping: Record<string, string> = {
    'top-deliveries': '-operationalData.completedDeliveries',
    'top-rating': '-rating.average',
    'top-earnings': '-earnings.totalEarnings',
  };

  if (query.sortBy && sortMapping[query.sortBy as string]) {
    query.sortBy = sortMapping[query.sortBy as string];
  }

  const [orderStats, topPartnerAggregation, overallAcceptance] =
    await Promise.all([
      Order.aggregate([
        {
          $match: {
            deliveryPartnerId: { $in: partnerIds },
            orderStatus: 'DELIVERED',
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$pricing.deliveryFee' },
            avgTimeMs: { $avg: { $subtract: ['$deliveredAt', '$pickedUpAt'] } },
          },
        },
      ]),

      Order.aggregate([
        {
          $match: {
            deliveryPartnerId: { $in: partnerIds },
            orderStatus: 'DELIVERED',
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: '$deliveryPartnerId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),

      DeliveryPartner.aggregate([
        { $match: { _id: { $in: partnerIds }, isDeleted: false } },
        {
          $group: {
            _id: null,
            totalOffered: { $sum: '$operationalData.totalOfferedOrders' },
            totalAccepted: { $sum: '$operationalData.totalAcceptedOrders' },
          },
        },
      ]),
    ]);

  const searchableFields = [
    'name.firstName',
    'name.lastName',
    'address.city',
    'userId',
  ];
  const partnerQuery = new QueryBuilder(
    DeliveryPartner.find({ 'registeredBy.id': managerId, isDeleted: false }),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const tableData = await partnerQuery.modelQuery;
  const meta = await partnerQuery.countTotal();

  const stats = orderStats[0] || { totalEarnings: 0, avgTimeMs: 0 };
  const avgDeliveryTimeMin = stats.avgTimeMs
    ? Math.round(stats.avgTimeMs / 60000)
    : 0;

  const acceptanceData = overallAcceptance[0];
  const avgAcceptanceRate =
    acceptanceData?.totalOffered > 0
      ? Math.round(
        (acceptanceData.totalAccepted / acceptanceData.totalOffered) * 100,
      )
      : 0;

  return {
    cards: {
      topPartnerDeliveries: topPartnerAggregation[0]?.count || 0,
      avgDeliveryTime: `${avgDeliveryTimeMin} min`,
      avgAcceptanceRate: `${avgAcceptanceRate}%`,
      totalEarnings: `€${roundTo2(stats.totalEarnings)}`,
    },
    table: {
      data: tableData.map((partner: TDeliveryPartner) => {
        const opData = partner.operationalData;

        const rowAcceptance =
          opData && opData.totalOfferedOrders && opData.totalOfferedOrders > 0
            ? Math.round(
              (opData.totalAcceptedOrders! / opData.totalOfferedOrders) * 100,
            ) + '%'
            : '0%';

        const rowAvgMins =
          opData?.completedDeliveries &&
            opData.completedDeliveries > 0 &&
            opData.totalDeliveryMinutes
            ? Math.round(
              opData.totalDeliveryMinutes / opData.completedDeliveries,
            )
            : 0;

        return {
          id: partner._id,
          name: `${partner?.name?.firstName} ${partner?.name?.lastName}`,
          displayId: partner.userId,
          vehicle: partner?.vehicleInfo?.vehicleType,
          city: partner?.address?.city || 'N/A',
          deliveries: opData?.completedDeliveries || 0,
          avgMins: `${rowAvgMins} min`,
          acceptance: rowAcceptance,
        };
      }),
      meta,
    },
  };
};

// Delivery Partner earning analytics service
const getDeliveryPartnerEarningAnalytics = async (currentUser: AuthUser) => {
  const riderObjectId = new Types.ObjectId(currentUser._id);

  const today = new Date();

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const earnings = await Transaction.aggregate([
    {
      $match: {
        userId: riderObjectId,
        userModel: 'DeliveryPartner',
        status: 'SUCCESS',
        type: 'DELIVERY_PARTNER_EARNING',
      },
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$totalAmount' },
        dailyEarnings: {
          $sum: {
            $cond: [{ $gte: ['$createdAt', startOfToday] }, '$totalAmount', 0],
          },
        },
        weeklyEarnings: {
          $sum: {
            $cond: [{ $gte: ['$createdAt', startOfWeek] }, '$totalAmount', 0],
          },
        },
        monthlyEarnings: {
          $sum: {
            $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$totalAmount', 0],
          },
        },
      },
    },
  ]);

  const wallet = await Wallet.findOne({
    userId: riderObjectId,
    userModel: 'DeliveryPartner',
  }).select('totalUnpaidEarnings');

  const report = earnings[0] || {
    totalEarnings: 0,
    dailyEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
  };

  return {
    daily: roundTo2(report.dailyEarnings),
    weekly: roundTo2(report.weeklyEarnings),
    monthly: roundTo2(report.monthlyEarnings),
    total: roundTo2(report.totalEarnings),
    unpaid: roundTo2(wallet?.totalUnpaidEarnings || 0),
  };
};

// Fleet manager earning analytics service
const getFleetManagerEarningAnalytics = async (currentUser: AuthUser) => {
  const fleetObjectId = new Types.ObjectId(currentUser._id);
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const stats = await Transaction.aggregate([
    {
      $match: {
        userId: fleetObjectId,
        userModel: 'FleetManager',
        status: 'SUCCESS',
        type: 'FLEET_EARNING',
      },
    },
    {
      $facet: {
        cardStats: [
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: '$totalAmount' },
              monthlyEarnings: {
                $sum: {
                  $cond: [
                    { $gte: ['$createdAt', startOfMonth] },
                    '$totalAmount',
                    0,
                  ],
                },
              },
              weeklyEarnings: {
                $sum: {
                  $cond: [
                    { $gte: ['$createdAt', startOfWeek] },
                    '$totalAmount',
                    0,
                  ],
                },
              },
            },
          },
        ],
        weeklyGraph: [
          {
            $match: {
              createdAt: {
                $gte: new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate() - 364,
                ),
              },
            },
          },
          {
            $project: {
              totalAmount: 1,
              weekNum: { $isoWeek: '$createdAt' },
              yearNum: { $isoWeekYear: '$createdAt' },
            },
          },
          {
            $group: {
              _id: { week: '$weekNum', year: '$yearNum' },
              earnings: { $sum: '$totalAmount' },
            },
          },
          { $sort: { '_id.year': 1, '_id.week': 1 } },
        ],
      },
    },
  ]);

  const wallet = await Wallet.findOne({
    userId: fleetObjectId,
    userModel: 'FleetManager',
  }).select('totalUnpaidEarnings totalRiderPayable totalEarnings');

  const cardData = stats[0].cardStats[0] || {
    totalEarnings: 0,
    monthlyEarnings: 0,
    weeklyEarnings: 0,
  };

  const graphData = stats[0].weeklyGraph.map((item: any) => ({
    week: `Week ${item._id.week}`,
    earnings: item.earnings,
    year: item._id.year,
  }));

  const totalRiderPayable = wallet?.totalRiderPayable || 0;
  const totalRevenue = cardData.totalEarnings;
  const netEarnings = totalRevenue - totalRiderPayable;

  return {
    overview: {
      totalRevenue: totalRevenue,
      riderPayable: totalRiderPayable,
      netEarnings: roundTo2(netEarnings),
      monthlyEarnings: cardData.monthlyEarnings,
      weeklyEarnings: cardData.weeklyEarnings,
      currentUnpaidBalance: wallet?.totalUnpaidEarnings || 0,
    },
    graph: graphData,
  };
};

// get vendor earnings analytics service
const getVendorEarningsAnalytics = async (currentUser: AuthUser) => {
  const vendorObjectId = new mongoose.Types.ObjectId(currentUser._id);
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [earningStats, orderStats, monthlyEarningsAgg] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          userId: vendorObjectId,
          userModel: 'Vendor',
          status: 'SUCCESS',
          type: 'VENDOR_EARNING',
        },
      },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: '$totalAmount' },
          todayIncome: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', startOfToday] },
                '$totalAmount',
                0,
              ],
            },
          },
          weekIncome: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', startOfWeek] }, '$totalAmount', 0],
            },
          },
          monthIncome: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', startOfMonth] },
                '$totalAmount',
                0,
              ],
            },
          },
        },
      },
    ]),

    Order.aggregate([
      { $match: { vendorId: vendorObjectId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, 1, 0] },
          },
          pendingOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$orderStatus', 'DELIVERED'] },
                    { $ne: ['$orderStatus', 'CANCELED'] },
                    { $ne: ['$orderStatus', 'REJECTED'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    // MONTHLY EARNINGS (LAST 6 MONTHS)
    Transaction.aggregate([
      {
        $match: {
          userId: vendorObjectId,
          userModel: 'Vendor',
          status: 'SUCCESS',
          type: 'VENDOR_EARNING',
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          earnings: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  const earnings = earningStats[0] || {
    todayIncome: 0,
    weekIncome: 0,
    monthIncome: 0,
    totalIncome: 0,
  };
  const orders = orderStats[0] || {
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
  };

  const MONTHS = [
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

  const monthlyEarnings = monthlyEarningsAgg.map((item) => ({
    name: MONTHS[item._id.month - 1],
    earnings: roundTo2(item.earnings),
  }));

  return {
    topCard: {
      totalEarnings: roundTo2(earnings.totalIncome),
      orders: orders.totalOrders,
      completed: orders.completedOrders,
      pending: orders.pendingOrders,
    },
    earningsOverview: {
      today: roundTo2(earnings.todayIncome),
      thisWeek: roundTo2(earnings.weekIncome),
      thisMonth: roundTo2(earnings.monthIncome),
      totalIncome: roundTo2(earnings.totalIncome),
    },
    monthlyEarnings,
  };
};

// get all customer analytics
const getAllCustomerAnalytics = async (query: Record<string, any>) => {
  const { searchTerm, status, sortBy, page = 1, limit = 10 } = query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const pipeline: any[] = [{ $match: { isDeleted: false } }];

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: [
          { 'name.firstName': { $regex: searchTerm, $options: 'i' } },
          { 'name.lastName': { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
        ],
      },
    });
  }

  if (status && status !== 'All') {
    pipeline.push({ $match: { status } });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'customerId',
        as: 'orderHistory',
      },
    },
    {
      $project: {
        customer: {
          name: { $concat: ['$name.firstName', ' ', '$name.lastName'] },
          email: '$email',
          profilePhoto: '$profilePhoto',
        },
        totalOrders: { $size: '$orderHistory' },
        totalSpent: { $sum: '$orderHistory.payoutSummary.grandTotal' },
        lastOrdered: { $max: '$orderHistory.createdAt' },
        joinedAt: '$createdAt',
        status: '$status',
      },
    },
  );

  let sortCondition: any = { totalOrders: -1 };
  if (sortBy === 'Newest First') sortCondition = { joinedAt: -1 };
  else if (sortBy === 'Oldest First') sortCondition = { joinedAt: 1 };
  else if (sortBy === 'Name (A-Z)') sortCondition = { 'customer.name': 1 };
  else if (sortBy === 'Name (Z-A)') sortCondition = { 'customer.name': -1 };

  pipeline.push({ $sort: sortCondition });

  const finalResult = await Customer.aggregate([
    ...pipeline,
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limitNumber }],
        totalCount: [{ $count: 'count' }],
      },
    },
  ]);

  const result = finalResult[0]?.data || [];
  const total = finalResult[0]?.totalCount[0]?.count || 0;

  return {
    meta: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPage: Math.ceil(total / limitNumber),
    },
    data: result,
  };
};

// vendor performance analytics
const getVendorPerformanceAnalytics = async (
  query: Record<string, unknown>,
) => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const results = await Vendor.aggregate([
    { $match: { isDeleted: false } },

    {
      $lookup: {
        from: 'orders',
        let: { vendorId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$vendorId', '$$vendorId'] },
                  { $eq: ['$orderStatus', 'DELIVERED'] },
                  { $eq: ['$isDeleted', false] },
                ],
              },
            },
          },
          {
            $project: {
              createdAt: 1,
              'payoutSummary.vendor': 1,
              totalItems: 1,
            },
          },
        ],
        as: 'vendorOrders',
      },
    },

    {
      $addFields: {
        totalRevenue: {
          $round: [
            { $sum: '$vendorOrders.payoutSummary.vendor.earningsWithoutTax' },
            2,
          ],
        },
        totalItems: { $sum: '$vendorOrders.totalItems' },
        totalOrdersCount: { $size: '$vendorOrders' },
      },
    },

    {
      $facet: {
        vendorPerformance: [
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
              businessDetails: 1,
              businessLocation: 1,
              rating: 1,
              totalOrders: '$totalOrdersCount',
              totalRevenue: 1,
              totalItems: 1,
            },
          },
        ],

        vendorPerformanceStat: [
          {
            $group: {
              _id: null,
              mostOrders: {
                $push: {
                  vendorName: {
                    $concat: ['$name.firstName', ' ', '$name.lastName'],
                  },
                  vendorPhoto: '$profilePhoto',
                  ordersCount: '$totalOrdersCount',
                },
              },
              highestRating: {
                $push: {
                  vendorName: {
                    $concat: ['$name.firstName', ' ', '$name.lastName'],
                  },
                  vendorPhoto: '$profilePhoto',
                  rating: '$rating',
                },
              },
              highestRevenue: {
                $push: {
                  vendorName: {
                    $concat: ['$name.firstName', ' ', '$name.lastName'],
                  },
                  vendorPhoto: '$profilePhoto',
                  revenue: '$totalRevenue',
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              mostOrders: {
                $arrayElemAt: [
                  {
                    $sortArray: {
                      input: '$mostOrders',
                      sortBy: { ordersCount: -1 },
                    },
                  },
                  0,
                ],
              },
              highestRating: {
                $arrayElemAt: [
                  {
                    $sortArray: {
                      input: '$highestRating',
                      sortBy: { 'rating.average': -1 },
                    },
                  },
                  0,
                ],
              },
              highestRevenue: {
                $arrayElemAt: [
                  {
                    $sortArray: {
                      input: '$highestRevenue',
                      sortBy: { revenue: -1 },
                    },
                  },
                  0,
                ],
              },
            },
          },
        ],

        vendorMonthlyPerformance: [
          { $unwind: '$vendorOrders' },
          { $match: { 'vendorOrders.createdAt': { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m',
                  date: '$vendorOrders.createdAt',
                },
              },
              totalOrders: { $sum: 1 },
              totalRevenue: {
                $sum: '$vendorOrders.payoutSummary.vendor.earningsWithoutTax',
              },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: 0,
              month: '$_id',
              totalOrders: 1,
              totalRevenue: { $round: ['$totalRevenue', 2] },
            },
          },
        ],

        topVendorPerformers: [
          { $sort: { 'rating.average': -1, totalRevenue: -1 } },
          { $limit: 3 },
          {
            $project: {
              _id: 0,
              vendorName: {
                $concat: ['$name.firstName', ' ', '$name.lastName'],
              },
              vendorPhoto: '$profilePhoto',
              rating: '$rating.average',
              totalRevenue: 1,
            },
          },
        ],

        totalCount: [{ $count: 'count' }],
      },
    },
  ]);

  const data = results[0];
  const total = data.totalCount[0]?.count || 0;

  return {
    data: {
      vendorPerformance: data.vendorPerformance,
      vendorPerformanceStat: data.vendorPerformanceStat[0] || {},
      vendorMonthlyPerformance: data.vendorMonthlyPerformance,
      topVendorPerformers: data.topVendorPerformers,
    },
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
  };
};

// get single vendor performance details
const getSingleVendorPerformanceDetails = async (
  vendorUserId: string,
  currentUser: AuthUser,
) => {
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access this resource',
    );
  }

  const vendor = await Vendor.findOne({
    userId: vendorUserId,
    isDeleted: false,
  });

  if (!vendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  const vendorObjectId = vendor._id;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const results = await Order.aggregate([
    {
      $match: {
        vendorId: vendorObjectId,
        orderStatus: 'DELIVERED',
        isDeleted: false,
      },
    },
    {
      $facet: {
        vendorMonthlyPerformance: [
          { $match: { createdAt: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$payoutSummary.vendor.vendorNetPayout' },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: 0,
              month: '$_id',
              totalOrders: 1,
              totalRevenue: { $round: ['$totalRevenue', 2] },
            },
          },
        ],

        topRatedItems: [
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              name: { $first: '$items.name' },
              image: { $first: '$items.image' },
              totalOrders: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: 'products',
              localField: '_id',
              foreignField: '_id',
              as: 'productInfo',
            },
          },
          {
            $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true },
          },
          {
            $project: {
              _id: 1,
              productId: { $toString: '$_id' },
              name: 1,
              images: {
                $cond: [{ $ifNull: ['$image', false] }, ['$image'], []],
              },
              totalOrders: 1,
              rating: {
                average: { $ifNull: ['$productInfo.rating.average', 0] },
              },
            },
          },
          { $sort: { 'rating.average': -1, totalOrders: -1 } },
          { $limit: 4 },
        ],

        overallStats: [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$payoutSummary.vendor.vendorNetPayout' },
              totalItems: { $sum: '$totalItems' },
              totalOrders: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const stats = results[0]?.overallStats[0] || {
    totalRevenue: 0,
    totalItems: 0,
    totalOrders: 0,
  };

  const vendorMonthlyPerformance = results[0]?.vendorMonthlyPerformance || [];
  const topRatedItems = results[0]?.topRatedItems || [];

  return {
    vendorPerformance: {
      _id: vendor._id,
      profilePhoto: vendor.profilePhoto,
      userId: vendor.userId,
      email: vendor.email,
      status: vendor.status,
      name: vendor.name,
      businessDetails: vendor.businessDetails,
      businessLocation: vendor.businessLocation,
      rating: vendor.rating,
      totalOrders: stats.totalOrders,
      totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
      totalItems: stats.totalItems,
    },
    vendorMonthlyPerformance,
    topRatedItems,
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
  getFleetManagerPerformanceAnalytics,
  getSingleFleetPerformanceDetailsAnalytics,
  getAdminVendorSalesAnalytics,
  getDeliveryPartnerPerformanceAnalytics,
  getSingleDeliveryPartnerPerformanceDetailsAnalytics,

  // ----------------------------------
  // New Analytics Services (Developer: Umayer)
  // ----------------------------------
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
