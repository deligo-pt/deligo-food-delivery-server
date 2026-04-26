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
import { Wallet } from '../Wallet/wallet.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { PipelineStage } from 'mongoose';
import {
  generateEmptyBuckets,
  getGroupingPipeline,
  getReportTimeframe,
  mapGrowthToTimeline,
} from './analytics.utils';

// --------------------------------------------------------------------------------------
// ----------------------- ANALYTICS SERVICES (Developer Morshed) -----------------------
// --------------------------------------------------------------------------------------

const timezone = 'Europe/Lisbon';

// get vendor sales analytics
const getVendorSalesAnalytics = async (currentUser: AuthUser) => {
  const vendorId = new Types.ObjectId(currentUser._id);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

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
        // Weekly sales
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

  let totalSales = 0;

  if (result?.totalSales?.length) {
    totalSales = roundTo2(result.totalSales[0].total);
  }

  if (result?.weeklySales?.length) {
    result.weeklySales.forEach((item: any) => {
      const index = item._id - 1;
      weeklyTrend[index].total = roundTo2(item.total);
    });
  }

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
    totalSales,
    bestPerformingDay,
    slowestDay,
    weeklyTrend,
    topSellingItems:
      result?.topItems?.map((item: any) => ({
        id: item._id,
        name: item.name,
        sold: item.sold,
      })) || [],
  };
};

// get customer insights controller
const getCustomerInsights = async (currentUser: AuthUser) => {
  const vendorId = new Types.ObjectId(currentUser._id);

  const now = new Date();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

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
      $facet: {
        /** ---------------- ORDER FREQUENCY ---------------- */
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

        /** ---------------- CUSTOMER GROUP ---------------- */
        customers: [
          {
            $group: {
              _id: '$customerId',
              totalOrders: { $sum: 1 },
              totalSpent: { $sum: '$payoutSummary.grandTotal' },
              firstOrderDate: { $min: '$createdAt' },
              city: { $first: '$deliveryAddress.city' },
            },
          },
        ],

        /** ---------------- HEATMAP ---------------- */
        heatmap: [
          {
            $match: {
              createdAt: { $gte: sevenDaysAgo },
            },
          },
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
                  $hour: {
                    date: '$createdAt',
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

  const orderFrequencyRaw = facet?.orderFrequency?.[0] || {};
  const customersRaw = facet?.customers || [];
  const heatmapRaw = facet?.heatmap || [];

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

  /** ---------------- DEMOGRAPHICS ---------------- */
  const cityMap: Record<string, number> = {};

  customersRaw.forEach((c: any) => {
    if (!c.city) return;
    cityMap[c.city] = (cityMap[c.city] || 0) + 1;
  });

  const demographicsRaw = Object.entries(cityMap)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  /** ---------------- VALUE SEGMENTS ---------------- */
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
      {
        name: 'weekly',
        orders: orderFrequencyRaw.weekly || 0,
      },
      {
        name: 'biweekly',
        orders: orderFrequencyRaw.biweekly || 0,
      },
      {
        name: 'monthly',
        orders: orderFrequencyRaw.monthly || 0,
      },
    ],

    heatmap: heatmapRaw.map((h: any) => ({
      day: days[h._id.day - 1],
      hour: formatHour(h._id.hour),
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
        // Daily volume chart (last 14 days)
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
              _id: {
                $hour: { date: '$createdAt', timezone: 'Europe/Lisbon' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 4 },
        ],

        // Category Growth (FIXED PART)
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
          {
            $match: {
              createdAt: { $gte: sevenDaysAgo },
            },
          },
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

  const totalItemsSold = facet?.totalItemsSold?.[0]?.total || 0;

  const previousMap = new Map(
    (facet?.previousPeriod || []).map((p: any) => [String(p._id), p.sold]),
  );

  const topItems = (facet?.currentPeriod || [])
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
        name: item.name,
        image: item.image || null,
        sold: item.sold,
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

  if (hasTimeframe && timeframe) {
    const timeframeToDaysMap: Record<string, number> = {
      last7days: 7,
      last14days: 14,
      last30days: 30,
    };

    const days = timeframeToDaysMap[timeframe as string];

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

  // Build the dynamic match for growth
  const growthMatch: any = { isDeleted: false };
  if (start) {
    growthMatch.createdAt = { $gte: start, $lte: end };
  }

  const [analytics] = await Customer.aggregate([
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
                { $group: { _id: null, totalRev: { $sum: '$totalEarnings' } } },
              ],
              as: 'walletStats',
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
  ]);

  const rawStats = analytics.stats[0] || {};

  const customerGrowth = mapGrowthToTimeline({
    growth: analytics.growth,
    timelineMap,
    start,
    end,
    resolution,
    size,
  }).map((item) => ({
    label: item.time,
    value: item.value,
  }));

  return {
    stats: {
      totalCustomers: rawStats.totalCustomers || 0,
      activeCustomers: rawStats.activeCustomers || 0,
      totalSpent: rawStats.walletStats?.[0]?.totalRev || 0,
      totalOrders: rawStats.totalOrderCount?.[0]?.count || 0,
    },

    customerGrowth,

    statusDistribution: {
      active:
        analytics.statusStats.find((s: any) => s._id === 'APPROVED')?.count ||
        0,
      blocked:
        analytics.statusStats.find((s: any) => s._id === 'BLOCKED')?.count || 0,
      pending:
        analytics.statusStats.find((s: any) => s._id === 'PENDING')?.count || 0,
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

  // 1. Generate the exact timeline map with 0s
  const timelineMap = generateEmptyBuckets(start, end, resolution, size);
  const groupId = getGroupingPipeline(resolution, size, start);

  // Growth match based on timeframe (or all if timeframe is null)
  const growthMatch: any = { isDeleted: false };
  if (start) {
    growthMatch.createdAt = { $gte: start, $lte: end };
  }

  const [analytics] = await Vendor.aggregate([
    {
      $facet: {
        // GLOBAL STATS & STATUS DISTRIBUTION
        statusStats: [
          { $match: { isDeleted: false } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],

        // VENDOR GROWTH (Timeframe aware)
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

  // Helper to find count by status
  const getCount = (status: string) =>
    analytics.statusStats.find((s: any) => s._id === status)?.count || 0;

  // Map Growth Labels (Reusing the logic from Customer Report)
  // 2. Map MongoDB results into timelineMap (IMPORTANT FIX)
  const vendorGrowths = mapGrowthToTimeline({
    growth: analytics.growth,
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

  // 1. Generate the exact timeline map with 0s
  const timelineMap = generateEmptyBuckets(start, end, resolution, size);
  const groupId = getGroupingPipeline(resolution, size, start);

  // Match only within timeframe if provided, otherwise all non-deleted
  const growthMatch: any = { isDeleted: false };
  if (timeframe || fromDate) {
    growthMatch.createdAt = { $gte: start, $lte: end };
  }

  const [analytics] = await FleetManager.aggregate([
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
          {
            $lookup: {
              from: 'drivers',
              pipeline: [{ $match: { isDeleted: false } }, { $count: 'count' }],
              as: 'driverCount',
            },
          },
          {
            $lookup: {
              from: 'orders',
              pipeline: [
                { $match: { isDeleted: false, status: 'DELIVERED' } },
                { $count: 'count' },
              ],
              as: 'deliveryCount',
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
  ]);

  const summary = analytics.summary[0] || {};

  // 2. Map MongoDB results to the correct timeline labels
  const fleetGrowths = mapGrowthToTimeline({
    growth: analytics.growth,
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
    analytics.statusStats.find((s: any) => s._id === status)?.count || 0;

  return {
    stats: {
      totalManagers: summary.totalManagers || 0,
      approvedManagers: summary.approvedManagers || 0,
      totalDrivers: summary.driverCount?.[0]?.count || 0,
      totalDeliveries: summary.deliveryCount?.[0]?.count || 0,
    },

    fleetGrowths,

    statusDistribution: {
      approved: getStatusCount('APPROVED'),
      pending: getStatusCount('PENDING'),
      submitted: getStatusCount('SUBMITTED'),
      rejected: getStatusCount('REJECTED'),
      blocked: getStatusCount('BLOCKED'),
    },
  };
};

// admin fleet manager report analytics
const getAdminDeliveryPartnerReportAnalytics = async (
  timeframe?: string,
  fromDate?: string,
  toDate?: string,
) => {
  const { start, end, resolution, size } = getReportTimeframe(
    timeframe,
    fromDate,
    toDate,
  );

  // 1. Generate the empty 0-value template
  const timelineMap = generateEmptyBuckets(start, end, resolution, size);

  const groupId = getGroupingPipeline(resolution, size, start);
  const growthMatch: any = { isDeleted: false };
  if (start) growthMatch.createdAt = { $gte: start, $lte: end };

  const [analytics] = await DeliveryPartner.aggregate([
    {
      $facet: {
        // TOP STATS
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
          {
            $lookup: {
              from: 'wallets',
              pipeline: [
                { $match: { userModel: 'DeliveryPartner' } },
                {
                  $group: {
                    _id: null,
                    totalEarned: { $sum: '$totalEarnings' },
                  },
                },
              ],
              as: 'walletStats',
            },
          },
        ],
        // VENDOR GROWTHS OVER TIMEFRAME
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
        // VEHICLE DISTRIBUTION
        vehicleStats: [
          { $match: { isDeleted: false } },
          { $group: { _id: '$vehicleInfo.vehicleType', count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const summary = analytics.summary[0] || {};

  // 2. Merge DB results into our timelineMap
  const partnerGrowths = mapGrowthToTimeline({
    growth: analytics.growth,
    timelineMap,
    start,
    end,
    resolution,
    size,
  }).map((item) => ({
    time: item.time,
    managers: item.value,
  }));

  const getVehicleCount = (type: string) =>
    analytics.vehicleStats.find((v: any) => v._id === type)?.count || 0;

  return {
    stats: {
      totalPartners: summary.totalPartners || 0,
      approvedPartners: summary.approvedPartners || 0,
      totalDeliveries: summary.totalDeliveries || 0,
      totalEarnings: summary.walletStats?.[0]?.totalEarned || 0,
    },

    partnerGrowths,

    vehicleDistribution: {
      'E-BIKE': getVehicleCount('E-BIKE'),
      BICYCLE: getVehicleCount('BICYCLE'),
      SCOOTER: getVehicleCount('SCOOTER'),
      MOTORBIKE: getVehicleCount('MOTORBIKE'),
      CAR: getVehicleCount('CAR'),
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

// get vendor tax report
const getVendorTaxReport = async (
  currentUser: AuthUser,
): Promise<TTaxReport> => {
  const vendorId = new mongoose.Types.ObjectId(currentUser._id);
  const now = new Date();

  // Calculate date for 6 months ago (start of the month)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [report] = await Order.aggregate([
    {
      $match: {
        vendorId,
        isPaid: true,
        isDeleted: false,
        createdAt: { $gte: sixMonthsAgo },
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
                    in: { $add: ['$$value', '$$this.taxAmount'] },
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
          // Collect all taxes (product tax + all addon taxes)
          {
            $project: {
              allTaxes: {
                $concatArrays: [
                  // Product tax
                  [
                    {
                      rate: '$items.productPricing.taxRate',
                      amount: '$items.productPricing.taxAmount',
                    },
                  ],
                  // Addon taxes
                  {
                    $map: {
                      input: '$items.addons',
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

          // Group by tax rate and sum the amount
          {
            $group: {
              _id: '$allTaxes.rate',
              totalTaxAmount: { $sum: '$allTaxes.amount' },
            },
          },

          // Calculate total tax across all rates (for percentage)
          {
            $group: {
              _id: null,
              taxes: { $push: { rate: '$_id', amount: '$totalTaxAmount' } },
              grandTotalTax: { $sum: '$totalTaxAmount' },
            },
          },

          { $unwind: '$taxes' },

          // Final projection with name, value, and percentage
          {
            $project: {
              name: {
                $concat: [{ $toString: '$taxes.rate' }, '%'],
              },
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
                month: { $month: '$createdAt' },
                year: { $year: '$createdAt' },
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
              _id: '$items.addons.name',
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

  // --- 6 Month Continuity Logic (Matches your Vibe) ---
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

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();

    const found = report?.monthlyRaw?.find(
      (item: any) => item._id.month === m + 1 && item._id.year === y,
    );

    revenueData.push({
      name: monthNames[m],
      revenue: found ? Number(found.revenue.toFixed(2)) : 0,
      tax: found ? Number(found.tax.toFixed(2)) : 0,
    });
  }

  // Format final return
  const stats = report?.stats?.[0] || {
    totalSales: 0,
    totalTax: 0,
    netRevenue: 0,
  };

  return {
    stats: {
      totalSales: Number(stats.totalSales.toFixed(2)),
      totalTax: Number(stats.totalTax.toFixed(2)),
      netRevenue: Number(stats.netRevenue.toFixed(2)),
    },
    taxContribution: report.taxContribution.length
      ? report.taxContribution.map((c: any) => ({
          name: c.name,
          value: Number(c.value.toFixed(1)),
        }))
      : [
          { name: 'Product', value: 0 },
          { name: 'Addon', value: 0 },
        ],
    taxByCategory: report.taxByCategory,
    revenueData,
    addonTax: report.addonTax,
  };
};

// get fleet manager performane analytics
const getFleetManagerPerformanceAnalytics = async (
  query: Record<string, unknown>,
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
        role: 'FLEET_MANAGER',
        isDeleted: false,
      },
    },

    // riders
    {
      $lookup: {
        from: 'deliverypartners',
        localField: '_id',
        foreignField: 'registeredBy.id',
        as: 'riders',
      },
    },

    // orders
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

    // metrics
    {
      $addFields: {
        totalDeliveries: { $size: '$orders' },
        totalEarnings: { $sum: '$orders.payoutSummary.fleet.fee' },
        fleetName: '$name',
        fleetPhoto: '$profilePhoto',
        ratingAvg: { $ifNull: ['$rating.average', 0] },
      },
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
              customUserId: 1,
              email: 1,
              status: 1,
              name: 1,
              address: 1,
              totalDeliveries: 1,
              totalEarnings: 1,
            },
          },
        ],

        // Stats
        stats: [
          {
            $group: {
              _id: null,

              mostOrders: {
                $max: {
                  deliveries: '$totalDeliveries',
                  name: '$fleetName',
                  photo: '$fleetPhoto',
                },
              },

              highestEarnings: {
                $max: {
                  earnings: '$totalEarnings',
                  name: '$fleetName',
                  photo: '$fleetPhoto',
                },
              },

              highestRating: {
                $max: {
                  rating: '$ratingAvg',
                  name: '$fleetName',
                  photo: '$fleetPhoto',
                },
              },
            },
          },
        ],

        // Weekly Performance
        weekly: [
          { $unwind: '$orders' },

          {
            $match: {
              'orders.createdAt': { $gte: startOfWeek },
            },
          },

          {
            $group: {
              _id: {
                $dayOfWeek: '$orders.createdAt',
              },
              totalOrders: { $sum: 1 },
              totalEarnings: { $sum: '$orders.payoutSummary.fleet.fee' },
            },
          },
        ],

        // Top Fleets
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
  ]);

  const stats = result.stats?.[0] || {};

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
      totalEarnings: roundTo2(data?.totalEarnings) || 0,
    };
  });

  return {
    data: {
      fleetPerformance: result.fleetPerformance,

      fleetPerformanceStat: {
        mostOrders: {
          fleetName: stats?.mostOrders?.name || '',
          fleetPhoto: stats?.mostOrders?.photo || '',
          ordersCount: stats?.mostOrders?.deliveries || 0,
        },

        highestEarnings: {
          fleetName: stats?.highestEarnings?.name || '',
          fleetPhoto: stats?.highestEarnings?.photo || '',
          earnings: roundTo2(stats?.highestEarnings?.earnings) || 0,
        },

        highestRating: {
          fleetName: stats?.highestRating?.name || '',
          fleetPhoto: stats?.highestRating?.photo || '',
          rating: stats?.highestRating?.rating || 0,
        },
      },

      fleetWeeklyPerformance,

      topFleetPerformers: result.topFleetPerformers,
    },

    meta: {
      page: Number(page),
      limit: Number(limit),
      total: result.totalCount?.[0]?.count || 0,
      totalPage: Math.ceil(
        (result.totalCount?.[0]?.count || 0) / Number(limit),
      ),
    },
  };
};

// get single fleet manager performance details analytics
const getSingleFleetPerformanceDetailsAnalytics = async (
  fleetManagerId: string,
) => {
  const now = new Date();

  // Fleet Manager
  const fleetManager = await FleetManager.findOne({
    customUserId: fleetManagerId,
  })
    .select('_id profilePhoto customUserId email status name address rating')
    .lean();

  if (!fleetManager) {
    throw new Error('Fleet Manager not found');
  }

  // Get Fleet Drivers
  const drivers = await DeliveryPartner.find({
    'registeredBy.id': fleetManager._id,
    isDeleted: false,
  })
    .select('_id customUserId name rating')
    .lean();

  const driverIds = drivers.map((d) => d._id);

  const totalDrivers = driverIds.length;

  // Fleet Orders + Earnings
  const [orderStats] = await Order.aggregate([
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
  ]);

  const stats = orderStats || { totalDeliveries: 0, totalEarnings: 0 };

  // Fleet Performance
  const fleetPerformance = {
    ...fleetManager,
    totalDrivers,
    totalDeliveries: stats.totalDeliveries,
    totalEarnings: roundTo2(stats.totalEarnings),
  };

  // Weekly Performance (Last 7 days)
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  const weeklyRaw = await Order.aggregate([
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
        _id: { $dayOfWeek: '$createdAt' },
        totalOrders: { $sum: 1 },
        totalEarnings: { $sum: '$payoutSummary.fleet.fee' },
      },
    },
  ]);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const weeklyMap = new Map();
  weeklyRaw.forEach((w: any) => weeklyMap.set(w._id, w));

  const fleetWeeklyPerformance = days.map((day, index) => {
    const mongoDay = index === 0 ? 1 : index + 1;
    const found = weeklyMap.get(mongoDay);

    return {
      day,
      totalOrders: found?.totalOrders || 0,
      totalEarnings: roundTo2(found?.totalEarnings || 0),
    };
  });

  // Top Rated Drivers
  const topRatedDrivers = drivers
    .sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0))
    .slice(0, 4)
    .map((driver) => ({
      _id: driver._id,
      customUserId: driver.customUserId,
      name: driver.name,
      rating: driver.rating?.average || 0,
    }));

  return {
    fleetPerformance,
    fleetWeeklyPerformance,
    topRatedDrivers,
  };
};

// get admin delivery partner performance analytics
const getDeliveryPartnerPerformanceAnalytics = async (
  query: Record<string, unknown>,
): Promise<{
  data: TPartnerPerformanceData;
  meta: TMeta;
}> => {
  const { page = 1, limit = 10 } = query;

  const skip = (Number(page) - 1) * Number(limit);

  const now = new Date();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const result = await DeliveryPartner.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },

    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'deliveryPartnerId',
        pipeline: [
          {
            $match: {
              orderStatus: 'DELIVERED',
              isDeleted: false,
            },
          },
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

        rating: {
          $ifNull: ['$rating.average', 0],
        },
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
              customUserId: 1,
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

        topCards: [
          {
            $group: {
              _id: null,

              mostOrders: {
                $max: {
                  ordersCount: '$totalDeliveries',
                  partnerName: '$name',
                  partnerPhoto: '$profilePhoto',
                },
              },

              highestEarnings: {
                $max: {
                  earnings: '$totalEarnings',
                  partnerName: '$name',
                  partnerPhoto: '$profilePhoto',
                },
              },

              highestRated: {
                $max: {
                  rating: '$rating',
                  partnerName: '$name',
                  partnerPhoto: '$profilePhoto',
                },
              },
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
              totalEarnings: '$totalEarnings',
              profilePhoto: 1,
              initials: {
                $concat: [
                  { $substr: ['$name.firstName', 0, 1] },
                  { $substr: ['$name.lastName', 0, 1] },
                ],
              },
            },
          },
        ],

        totalCount: [{ $count: 'count' }],
      },
    },
  ]);

  const data = result[0];

  // Monthly Earnings Performance
  const monthlyRaw = await Order.aggregate([
    {
      $match: {
        orderStatus: 'DELIVERED',
        isDeleted: false,
        createdAt: { $gte: sixMonthsAgo },
      },
    },

    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        totalOrders: { $sum: 1 },
      },
    },

    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

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

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const found = monthlyRaw.find(
      (m) => m._id.month === month && m._id.year === year,
    );

    earningsPerformance.push({
      month: monthNames[d.getMonth()],
      totalOrders: found?.totalOrders || 0,
    });
  }

  const stats = data.topCards?.[0] || {};

  const response: TPartnerPerformanceData = {
    partnerPerformance: data.partnerPerformance,

    topCards: {
      mostOrders: {
        partnerName: stats?.mostOrders?.partnerName || '',
        partnerPhoto: stats?.mostOrders?.partnerPhoto || '',
        ordersCount: stats?.mostOrders?.ordersCount || 0,
      },

      highestRated: {
        partnerName: stats?.highestRated?.partnerName || '',
        partnerPhoto: stats?.highestRated?.partnerPhoto || '',
        rating: {
          average: stats?.highestRated?.rating || 0,
          totalRatings: 0,
        },
      },

      highestEarnings: {
        partnerName: stats?.highestEarnings?.partnerName || '',
        partnerPhoto: stats?.highestEarnings?.partnerPhoto || '',
        earnings: stats?.highestEarnings?.earnings || 0,
      },
    },

    earningsPerformance,

    topPerformers: data.topPerformers,
  };

  return {
    data: response,

    meta: {
      page: Number(page),
      limit: Number(limit),
      total: data.totalCount?.[0]?.count || 0,
      totalPage: Math.ceil((data.totalCount?.[0]?.count || 0) / Number(limit)),
    },
  };
};

// get admin single delivery partner performance details analytics
const getSingleDeliveryPartnerPerformanceDetailsAnalytics = async (
  partnerUserId: string,
): Promise<TPartnerPerformanceDetailsData> => {
  const now = new Date();

  // Find partner
  const partner = await DeliveryPartner.findOne({ customUserId: partnerUserId })
    .select(
      '_id profilePhoto customUserId email status name address operationalData rating',
    )
    .lean();

  if (!partner) {
    throw new Error('Delivery partner not found');
  }

  // Total Deliveries & Earnings
  const [stats] = await Order.aggregate([
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
        totalEarnings: {
          $sum: '$payoutSummary.rider.riderNetEarnings',
        },
      },
    },
  ]);

  const partnerPerformance: TDeliveryPartnerPerformance = {
    ...partner,
    totalDeliveries: stats?.totalDeliveries || 0,
    totalEarnings: roundTo2(stats?.totalEarnings || 0),
    rating: partner?.rating?.average || 0,
  };

  // Last 6 Months Performance
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const monthlyRaw = await Order.aggregate([
    {
      $match: {
        deliveryPartnerId: partner._id,
        orderStatus: 'DELIVERED',
        isDeleted: false,
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        totalOrders: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

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

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const found = monthlyRaw.find(
      (m) => m._id.month === month && m._id.year === year,
    );

    partnerMonthlyPerformance.push({
      month: monthNames[d.getMonth()],
      totalOrders: found?.totalOrders || 0,
    });
  }

  return {
    partnerPerformance,
    partnerMonthlyPerformance,
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
    summary: {
      newCustomers,
      returningCustomers,
      churnRate:
        customerBase.length > 0
          ? Number(((churnedCustomers / customerBase.length) * 100).toFixed(2))
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
        customerId: c.userDetails?.customUserId || 'N/A',
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
        userCount: customerBase.filter((c: any) => c.ordersInSelectedRange > 5)
          .length,
      },
    ],
    hourlyOrders: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      orderCount:
        facet.hourlyDistribution.find((h: any) => h._id === hour)?.count || 0,
    })),
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
        vendorId: '$vendorInfo.customUserId',
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
    topSellingVendors: results.topSellingVendors || [],
    vendorPerformance: results.vendorPerformance || [],
    ratingDistribution: results.ratingDistribution || [],
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
                riderId: { $ifNull: ['$rider.customUserId', 'N/A'] },
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
          riderId: { $toString: '$customUserId' },
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
              ((summary.rejectedCount / summary.totalOrders) * 100).toFixed(1),
            )
          : 0,
    },
    riderPerformance: facet.riderPerformance,
    distanceTimeAnalysis: facet.distanceTimeAnalysis,
    areaPerformance: facet.areaPerformance,
    riderIdleTime: riderIdle,
    rejectedReasons: facet.rejectedReasons,
  };
};

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
    {
      $group: {
        _id: null,
        allData: { $push: '$$ROOT' },
        grandTotal: { $sum: '$total' },
      },
    },
    { $unwind: '$allData' },
    {
      $project: {
        _id: '$allData._id',
        name: '$allData.categoryName',
        percentage: {
          $cond: {
            if: { $gt: ['$grandTotal', 0] },
            then: {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$allData.total', '$grandTotal'] },
                    100,
                  ],
                },
                2,
              ],
            },
            else: 0,
          },
        },
      },
    },
    { $sort: { percentage: -1 } },
    { $limit: 5 },
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
    'customUserId',
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
          displayId: partner.customUserId,
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
        userObjectId: riderObjectId,
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
    userObjectId: riderObjectId,
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
    userObjectId: fleetObjectId,
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

  const [earningStats, orderStats, monthlyEarningsAgg, productStats] =
    await Promise.all([
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
                $cond: [
                  { $gte: ['$createdAt', startOfWeek] },
                  '$totalAmount',
                  0,
                ],
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

      // PRODUCT STATS
      Product.aggregate([
        {
          $match: {
            vendorId: vendorObjectId,
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: null,

            total: { $sum: 1 },

            active: {
              $sum: {
                $cond: [{ $eq: ['$meta.status', 'ACTIVE'] }, 1, 0],
              },
            },

            inactive: {
              $sum: {
                $cond: [{ $eq: ['$meta.status', 'INACTIVE'] }, 1, 0],
              },
            },
          },
        },
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

  const products = productStats[0] || {
    total: 0,
    active: 0,
    inactive: 0,
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

    products: {
      total: products.total,
      active: products.active,
      inactive: products.inactive,
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
              customUserId: 1,
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
    customUserId: vendorUserId,
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
      customUserId: vendor.customUserId,
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
