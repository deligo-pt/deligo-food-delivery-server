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

import { Transaction } from '../Transaction/transaction.model';
import { Wallet } from '../Wallet/wallet.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { Offer } from '../Offer/offer.model';

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

// get offer analytics for admin

const getOfferAnalyticsForAdmin = async (currentUser: AuthUser) => {
  const now = new Date();

  const offerFilter: any = {
    isDeleted: false,
  };

  const orderFilter: any = {
    'offer.isApplied': true,
    isDeleted: false,
    orderStatus: { $ne: 'CANCELLED' },
  };

  if (currentUser?.role === 'VENDOR' && currentUser?._id) {
    const vId = new mongoose.Types.ObjectId(currentUser._id);
    offerFilter.vendorId = vId;
    orderFilter.vendorId = vId;
  }
  const [offerStats, orderStats] = await Promise.all([
    Offer.aggregate([
      { $match: offerFilter },
      {
        $group: {
          _id: null,
          totalOffers: { $sum: 1 },
          activeOffers: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$isActive', true] },
                    { $gt: ['$expiresAt', now] },
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

    Order.aggregate([
      { $match: orderFilter },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalRedemptions: { $sum: 1 },
                revenueImpact: { $sum: '$orderCalculation.totalOfferDiscount' },
              },
            },
          ],
          usageOverTime: [
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                redemptions: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { time: '$_id', redemptions: 1, _id: 0 } },
          ],
          typeUsage: [
            {
              $group: {
                _id: {
                  $cond: [
                    { $ifNull: ['$offer.offerApplied.bogoSnapshot', false] },
                    'BOGO',
                    '$offer.offerApplied.discountType',
                  ],
                },
                usage: { $sum: 1 },
              },
            },
            { $project: { name: '$_id', usage: 1, _id: 0 } },
          ],
          topOffers: [
            {
              $group: {
                _id: '$offer.offerApplied.title',
                usage: { $sum: 1 },
              },
            },
            { $sort: { usage: -1 } },
            { $limit: 5 },
            { $project: { name: '$_id', usage: 1, _id: 0 } },
          ],
        },
      },
    ]),
  ]);

  const stats = offerStats[0] || { totalOffers: 0, activeOffers: 0 };
  const orders = orderStats[0];

  return {
    stats: {
      totalOffers: stats.totalOffers,
      activeOffers: stats.activeOffers,
      totalRedemptions: orders.overall[0]?.totalRedemptions || 0,
      revenueImpact: roundTo2(orders.overall[0]?.revenueImpact),
    },
    usageOverTime: orders.usageOverTime,
    offerTypeUsage: orders.typeUsage,
    topOffers: orders.topOffers,
  };
};

export const AnalyticsSecondServices = {
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
