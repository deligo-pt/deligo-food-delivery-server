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
import { roundTo4 } from '../../utils/mathProvider';
import { Transaction, Wallet } from '../Payment/payment.model';

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
      $group: {
        _id: '$product.category',
        total: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'productcategories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    },
    { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        categoryId: '$_id',
        name: { $ifNull: ['$categoryDetails.name', 'Unknown'] },
        icon: { $ifNull: ['$categoryDetails.icon', ''] },
        slug: { $ifNull: ['$categoryDetails.slug', ''] },
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
  const vendorId = currentUser._id;

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

          // One order = one count per category
          {
            $group: {
              _id: {
                category: '$product.category',
                orderId: '$_id',
              },
            },
          },

          // Count orders per category
          {
            $group: {
              _id: '$_id.category',
              orderCount: { $sum: 1 },
            },
          },

          {
            $lookup: {
              from: 'productcategories',
              localField: '_id',
              foreignField: '_id',
              as: 'categoryDetails',
            },
          },
          {
            $unwind: {
              path: '$categoryDetails',
              preserveNullAndEmptyArrays: true,
            },
          },

          // Calculate TOTAL of all category orders
          {
            $group: {
              _id: null,
              totalCategoryOrders: { $sum: '$orderCount' },
              categories: { $push: '$$ROOT' },
            },
          },

          // Calculate percentage (SUM = 100%)
          { $unwind: '$categories' },
          {
            $project: {
              _id: 0,
              categoryId: '$categories._id',
              name: {
                $ifNull: ['$categories.categoryDetails.name', 'Unknown'],
              },
              icon: { $ifNull: ['$categories.categoryDetails.icon', ''] },
              slug: { $ifNull: ['$categories.categoryDetails.slug', ''] },
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
      totalEarnings: `€${roundTo4(stats.totalEarnings)}`,
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
              total: { $sum: '$subtotal' },
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
              sold: { $sum: '$items.quantity' },
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
              total: { $sum: '$subtotal' },
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
    totalSales = Number(result.totalSales[0].total.toFixed(2));
  }

  result.weeklySales.forEach((item: any) => {
    const index = item._id - 1;
    weeklyTrend[index].total = Number(item.total.toFixed(2));
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
    totalSales: totalSales.toFixed(2),
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

    return (sum / segment.length).toFixed(2);
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
    daily: report.dailyEarnings,
    weekly: report.weeklyEarnings,
    monthly: report.monthlyEarnings,
    total: report.totalEarnings,
    unpaid: wallet?.totalUnpaidEarnings || 0,
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
      netEarnings: roundTo4(netEarnings),
      monthlyEarnings: cardData.monthlyEarnings,
      weeklyEarnings: cardData.weeklyEarnings,
      currentUnpaidBalance: wallet?.totalUnpaidEarnings || 0,
    },
    graph: graphData,
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

  const [earningStats, orderStats, productStats] = await Promise.all([
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

    Product.aggregate([
      { $match: { vendorId: vendorObjectId } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ['$meta.status', 'ACTIVE'] }, 1, 0] },
          },
          inactiveProducts: {
            $sum: { $cond: [{ $eq: ['$meta.status', 'INACTIVE'] }, 1, 0] },
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
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
  };

  return {
    topCard: {
      totalEarnings: earnings.totalIncome.toFixed(2),
      orders: orders.totalOrders,
      completed: orders.completedOrders,
      pending: orders.pendingOrders,
    },
    earningsOverview: {
      today: earnings.todayIncome.toFixed(2),
      thisWeek: earnings.weekIncome.toFixed(2),
      thisMonth: earnings.monthIncome.toFixed(2),
      totalIncome: earnings.totalIncome.toFixed(2),
    },
    products: {
      total: products.totalProducts,
      active: products.activeProducts,
      inactive: products.inactiveProducts,
    },
  };
};

export const AnalyticsServices = {
  getAdminDashboardAnalytics,
  getVendorDashboardAnalytics,
  getFleetDashboardAnalytics,
  getPartnerPerformanceAnalytics,
  getVendorSalesAnalytics,
  getCustomerInsights,
  getOrderTrendInsights,
  getTopSellingItemsAnalytics,
  getDeliveryPartnerEarningAnalytics,
  getFleetManagerEarningAnalytics,
  getVendorEarningsAnalytics,
};
