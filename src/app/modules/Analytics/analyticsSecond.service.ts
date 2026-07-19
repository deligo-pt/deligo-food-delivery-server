/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Types } from 'mongoose';
import { Customer } from '../Customer/customer.model';
import { currentStatusOptions } from '../Delivery-Partner/delivery-partner.constant';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { FleetManager } from '../Fleet-Manager/fleet-manager.model';
import { Order } from '../Order/order.model';
import { Product } from '../Product/product.model';
import { Vendor } from '../Vendor/vendor.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { roundTo2 } from '../../utils/mathProvider';

import { Transaction } from '../Transaction/transaction.model';
import { Wallet } from '../Wallet/wallet.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { Offer } from '../Offer/offer.model';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { getLocalStartOfPeriod } from '../../utils/dateTimeProvider';

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
    orderCountsResult,
  ] = await Promise.all([
    Customer.countDocuments(),
    Vendor.countDocuments(),
    FleetManager.countDocuments(),
    DeliveryPartner.countDocuments(),
    Product.countDocuments({ isDeleted: false }),
    Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'PENDING'] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, 1, 0] },
          },
          canceled: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'CANCELED'] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const orderStats = orderCountsResult[0] || {
    total: 0,
    pending: 0,
    completed: 0,
    canceled: 0,
  };

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
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: false } },
    {
      $lookup: {
        from: 'productcategories',
        localField: 'product.category',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    },
    {
      $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: false },
    },
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
    .select('orderId orderStatus createdAt')
    .lean();

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
        let: { productId: '$_id' },
        pipeline: [
          { $match: { $expr: { $in: ['$$productId', '$items.productId'] } } },
          { $count: 'count' },
        ],
        as: 'orderCountData',
      },
    },
    {
      $project: {
        _id: 1,
        productId: 1,
        name: 1,
        images: 1,
        rating: { average: '$rating.average' },
        totalOrders: {
          $ifNull: [{ $arrayElemAt: ['$orderCountData.count', 0] }, 0],
        },
      },
    },
    { $sort: { 'rating.average': -1, totalOrders: -1 } },
    { $limit: 4 },
  ]);

  const topRatedDeliveryPartners = await DeliveryPartner.find({
    'rating.average': { $gte: 4 },
  })
    .sort({ 'rating.average': -1 })
    .limit(5)
    .select('name rating completedDeliveries')
    .lean();

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Admin Dashboard Analytics' },
    data: {
      counts: {
        customers,
        vendors,
        fleetManagers,
        deliveryPartners,
        totalProducts,
      },
      orders: {
        total: orderStats.total,
        pending: orderStats.pending,
        completed: orderStats.completed,
        canceled: orderStats.canceled,
      },
      popularCategories,
      recentOrders,
      topRatedItems,
      topRatedDeliveryPartners,
    },
  };
};

// get vendor dashboard analytics
const getVendorDashboardAnalytics = async (currentUser: TCurrentUser) => {
  const vendorId = new Types.ObjectId(currentUser._id);

  const products = await Product.find(
    { vendorId },
    '_id category rating meta.status images',
  )
    .populate({
      path: 'category',
      select: 'name icon',
    })
    .lean();

  const orderCountsResult = await Order.aggregate([
    { $match: { vendorId, isDeleted: false } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$orderStatus', 'PENDING'] }, 1, 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, 1, 0] },
        },
        canceled: {
          $sum: { $cond: [{ $eq: ['$orderStatus', 'CANCELED'] }, 1, 0] },
        },
      },
    },
  ]);

  const orderStats = orderCountsResult[0] || {
    total: 0,
    pending: 0,
    completed: 0,
    canceled: 0,
  };
  const totalOrders = orderStats.total;

  const popularCategories =
    totalOrders === 0
      ? []
      : await Order.aggregate([
          { $match: { vendorId, isDeleted: false } },
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
          { $sort: { percentage: -1 } },
        ]);

  const recentOrders = await Order.find({
    vendorId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(3)
    .populate('customerId', 'name')
    .select('orderId orderStatus createdAt')
    .lean();

  const topRatedItems = await Product.aggregate([
    {
      $match: {
        vendorId,
        isDeleted: false,
        'rating.average': { $gte: 4 },
      },
    },
    {
      $lookup: {
        from: 'orders',
        let: { productId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$vendorId', vendorId] },
                  { $in: ['$$productId', '$items.productId'] },
                ],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'orderCountData',
      },
    },
    {
      $project: {
        _id: 1,
        productId: 1,
        name: 1,
        images: 1,
        rating: { average: '$rating.average' },
        totalOrders: {
          $ifNull: [{ $arrayElemAt: ['$orderCountData.count', 0] }, 0],
        },
      },
    },
    { $sort: { 'rating.average': -1, totalOrders: -1 } },
    { $limit: 4 },
  ]);

  const activeProductsCount = products.filter(
    (p) => p.meta?.status === 'ACTIVE',
  ).length;
  const inactiveProductsCount = products.filter(
    (p) => p.meta?.status === 'INACTIVE',
  ).length;

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Vendor Dashboard Analytics' },
    data: {
      products: {
        total: products.length,
        active: activeProductsCount,
        inactive: inactiveProductsCount,
      },
      orders: {
        total: orderStats.total,
        pending: orderStats.pending,
        completed: orderStats.completed,
        canceled: orderStats.canceled,
      },
      popularCategories,
      recentOrders,
      topRatedItems,
    },
  };
};

// get fleet dashboard analytics
const getFleetDashboardAnalytics = async (currentUser: TCurrentUser) => {
  const managerId = new Types.ObjectId(currentUser._id);
  const startOfDay = getLocalStartOfPeriod('today');

  const [partnerMetrics] = await DeliveryPartner.aggregate([
    { $match: { 'registeredBy.id': managerId, isDeleted: false } },
    {
      $facet: {
        totalCount: [{ $count: 'count' }],
        vehicleComposition: [
          { $group: { _id: '$vehicleInfo.vehicleType', count: { $sum: 1 } } },
        ],
        statusStats: [
          {
            $group: {
              _id: '$operationalData.currentStatus',
              count: { $sum: 1 },
            },
          },
        ],
        topDrivers: [
          { $sort: { 'rating.average': -1, createdAt: -1 } },
          { $limit: 4 },
          {
            $project: {
              name: 1,
              'personalInfo.gender': 1,
              'personalInfo.nationality': 1,
              rating: 1,
              'operationalData.completedDeliveries': 1,
              vehicleInfo: 1,
            },
          },
        ],
        partnerIds: [{ $project: { _id: 1 } }],
      },
    },
  ]);

  const totalPartners = partnerMetrics.totalCount[0]?.count || 0;
  const rawPartnerIds = partnerMetrics.partnerIds.map((p: any) => p._id);

  const todayDeliveriesCount =
    rawPartnerIds.length > 0
      ? await Order.countDocuments({
          orderStatus: 'DELIVERED',
          createdAt: { $gte: startOfDay },
          deliveryPartnerId: { $in: rawPartnerIds },
        })
      : 0;

  const statusStats = partnerMetrics.statusStats || [];

  const offlinePartners =
    statusStats.find((s: any) => s._id === currentStatusOptions.OFFLINE)
      ?.count || 0;
  const waitingPartners =
    statusStats.find((s: any) => s._id === currentStatusOptions.IDLE)?.count ||
    0;
  const onDeliveryPartners =
    statusStats.find((s: any) => s._id === currentStatusOptions.ON_DELIVERY)
      ?.count || 0;

  const onlinePartners = totalPartners - offlinePartners;

  const onlinePercentage =
    totalPartners > 0
      ? ((onlinePartners / totalPartners) * 100).toFixed(1)
      : '0';

  const avgDeliveries =
    totalPartners > 0 ? (todayDeliveriesCount / totalPartners).toFixed(1) : '0';

  const availabilityRate =
    onlinePartners > 0
      ? ((waitingPartners / onlinePartners) * 100).toFixed(1)
      : '0';

  const formattedTopDrivers = (partnerMetrics.topDrivers || []).map(
    (driver: any) => ({
      ...driver,
      name:
        `${driver?.name?.firstName || ''} ${driver?.name?.lastName || ''}`.trim() ||
        'N/A',
    }),
  );

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Fleet Dashboard Analytics' },
    data: {
      cards: {
        totalPartners,
        onlineNow: {
          count: onlinePartners,
          percentage: `${onlinePercentage}%`,
        },
        deliveriesToday: {
          total: todayDeliveriesCount,
          avgPerPartner: avgDeliveries,
        },
        availabilityRate: `${availabilityRate}%`,
      },
      fleetComposition: (partnerMetrics.vehicleComposition || []).map(
        (item: any) => ({
          vehicle: item._id || 'Other',
          count: item.count,
        }),
      ),
      partnerStatus: {
        onDelivery: onDeliveryPartners,
        waiting: waitingPartners,
        offline: offlinePartners,
      },
      topRatedDrivers: formattedTopDrivers,
    },
  };
};

// get partner performance analytics
const getPartnerPerformanceAnalytics = async (
  currentUser: TCurrentUser,
  query: Record<string, unknown>,
) => {
  const managerId = new Types.ObjectId(currentUser._id);

  const timeframe = (query?.timeframe as string) || 'last30days';
  const endDate = new Date();
  const startDate = getLocalStartOfPeriod('today');
  const days =
    timeframe === 'last30days' ? 30 : timeframe === 'last14days' ? 14 : 7;
  startDate.setDate(startDate.getDate() - days);

  const myPartners = await DeliveryPartner.find({
    'registeredBy.id': managerId,
    isDeleted: false,
  })
    .select('_id')
    .lean();

  const partnerIds = myPartners.map((p) => p._id);

  if (partnerIds.length === 0) {
    return {
      messageKey: 'DATA_LOAD_SUCCESS',
      variables: { entity: 'Partners Performance Analytics' },
      data: {
        cards: {
          topPartnerDeliveries: 0,
          avgDeliveryTime: '0 min',
          avgAcceptanceRate: '0%',
          totalEarnings: '€0',
        },
        table: {
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPage: 0 },
        },
      },
    };
  }

  const sortMapping: Record<string, string> = {
    'top-deliveries': '-operationalData.completedDeliveries',
    'top-rating': '-rating.average',
    'top-earnings': '-operationalData.totalDeliveries',
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
            totalEarnings: { $sum: '$payoutSummary.rider.riderNetEarnings' },
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

  const tableData = await partnerQuery.modelQuery.lean();
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
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Partners Performance Analytics' },
    data: {
      cards: {
        topPartnerDeliveries: topPartnerAggregation[0]?.count || 0,
        avgDeliveryTime: `${avgDeliveryTimeMin} min`,
        avgAcceptanceRate: `${avgAcceptanceRate}%`,
        totalEarnings: `€${roundTo2(stats.totalEarnings)}`,
      },
      table: {
        data: tableData.map((partner: any) => {
          const opData = partner.operationalData;

          const rowAcceptance =
            opData && opData.totalOfferedOrders && opData.totalOfferedOrders > 0
              ? Math.round(
                  (opData.totalAcceptedOrders / opData.totalOfferedOrders) *
                    100,
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

          const fullName =
            `${partner?.name?.firstName || ''} ${partner?.name?.lastName || ''}`.trim();

          return {
            id: partner._id,
            name: fullName || 'N/A',
            displayId: partner.userId,
            vehicle: partner?.vehicleInfo?.vehicleType || 'N/A',
            city: partner?.address?.city || 'N/A',
            deliveries: opData?.completedDeliveries || 0,
            avgMins: `${rowAvgMins} min`,
            acceptance: rowAcceptance,
          };
        }),
        meta,
      },
    },
  };
};

// Delivery Partner earning analytics service
const getDeliveryPartnerEarningAnalytics = async (
  currentUser: TCurrentUser,
) => {
  const riderObjectId = new Types.ObjectId(currentUser._id);

  const startOfToday = getLocalStartOfPeriod('today');
  const startOfWeek = getLocalStartOfPeriod('week');
  const startOfMonth = getLocalStartOfPeriod('month');

  const [earnings, wallet] = await Promise.all([
    Transaction.aggregate([
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
              $cond: [
                { $gte: ['$createdAt', startOfToday] },
                '$totalAmount',
                0,
              ],
            },
          },
          weeklyEarnings: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', startOfWeek] }, '$totalAmount', 0],
            },
          },
          monthlyEarnings: {
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

    Wallet.findOne({
      userId: riderObjectId,
      userModel: 'DeliveryPartner',
    })
      .select('currentBalance')
      .lean(),
  ]);

  const report = earnings[0] || {
    totalEarnings: 0,
    dailyEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
  };

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Delivery Partner Earnings Analytics' },
    data: {
      daily: roundTo2(report.dailyEarnings),
      weekly: roundTo2(report.weeklyEarnings),
      monthly: roundTo2(report.monthlyEarnings),
      total: roundTo2(report.totalEarnings),
      unpaid: roundTo2(wallet?.currentBalance || 0),
    },
  };
};

// Fleet manager earning analytics service
const getFleetManagerEarningAnalytics = async (currentUser: TCurrentUser) => {
  const fleetObjectId = new Types.ObjectId(currentUser._id);

  const startOfToday = getLocalStartOfPeriod('today');
  const startOfWeek = getLocalStartOfPeriod('week');
  const startOfMonth = getLocalStartOfPeriod('month');

  const startOfGraphRange = new Date(startOfToday);
  startOfGraphRange.setDate(startOfGraphRange.getDate() - 364);

  const [stats, wallet, fleetRiders] = await Promise.all([
    Transaction.aggregate([
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
                createdAt: { $gte: startOfGraphRange },
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
    ]),

    Wallet.findOne({
      userId: fleetObjectId,
      userModel: 'FleetManager',
    })
      .select('currentBalance')
      .lean(),

    DeliveryPartner.find({
      'registeredBy.id': fleetObjectId,
      'registeredBy.model': 'FleetManager',
      isDeleted: false,
    })
      .select('_id')
      .lean(),
  ]);

  const fleetRiderIds = fleetRiders.map((rider) => rider._id);
  let totalRiderPayable = 0;

  if (fleetRiderIds.length > 0) {
    const riderPayableAggregate = await Wallet.aggregate([
      {
        $match: {
          userId: { $in: fleetRiderIds },
          userModel: 'DeliveryPartner',
        },
      },
      {
        $group: {
          _id: null,
          totalPayable: { $sum: '$currentBalance' },
        },
      },
    ]);
    totalRiderPayable = riderPayableAggregate[0]?.totalPayable || 0;
  }

  const metrics = stats[0] || { cardStats: [], weeklyGraph: [] };
  const cardData = metrics.cardStats[0] || {
    totalEarnings: 0,
    monthlyEarnings: 0,
    weeklyEarnings: 0,
  };

  const graphData = (metrics.weeklyGraph || []).map((item: any) => ({
    week: `Week ${item._id.week}`,
    earnings: roundTo2(item.earnings),
    year: item._id.year,
  }));

  const pureFleetNetProfit = cardData.totalEarnings;

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Fleet Manager Earnings Analytics' },
    data: {
      overview: {
        totalRevenue: roundTo2(pureFleetNetProfit + totalRiderPayable),
        riderPayable: roundTo2(totalRiderPayable),
        netEarnings: roundTo2(pureFleetNetProfit),
        monthlyEarnings: roundTo2(cardData.monthlyEarnings),
        weeklyEarnings: roundTo2(cardData.weeklyEarnings),
        currentUnpaidBalance: roundTo2(wallet?.currentBalance || 0),
      },
      graph: graphData,
    },
  };
};

// get vendor earnings analytics service
const getVendorEarningsAnalytics = async (currentUser: TCurrentUser) => {
  const vendorObjectId = new mongoose.Types.ObjectId(currentUser._id);

  const startOfToday = getLocalStartOfPeriod('today');
  const startOfWeek = getLocalStartOfPeriod('week');
  const startOfMonth = getLocalStartOfPeriod('month');

  const sixMonthsAgo = getLocalStartOfPeriod('month');
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

  const [transactionMetrics, orderStats, productStats, wallet] =
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
          $facet: {
            earningStats: [
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
            ],
            monthlyEarningsAgg: [
              { $match: { createdAt: { $gte: sixMonthsAgo } } },
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
            ],
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

      Wallet.findOne({
        userId: vendorObjectId,
        userModel: 'Vendor',
      })
        .select('currentBalance')
        .lean(),
    ]);

  const metrics = transactionMetrics[0] || {
    earningStats: [],
    monthlyEarningsAgg: [],
  };

  const earnings = metrics.earningStats[0] || {
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

  const monthlyEarnings = (metrics.monthlyEarningsAgg || []).map(
    (item: any) => ({
      name: `${MONTHS[item._id.month - 1]} ${item._id.year}`,
      earnings: roundTo2(item.earnings),
    }),
  );

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Vendor earnings analytics' },
    data: {
      topCard: {
        totalEarnings: roundTo2(earnings.totalIncome),
        orders: orders.totalOrders,
        completed: orders.completedOrders,
        pending: orders.pendingOrders,
        currentUnpaidBalance: roundTo2(wallet?.currentBalance || 0),
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
    },
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
        let: { customerId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$customerId', '$$customerId'] } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              spent: { $sum: '$payoutSummary.grandTotal' },
              lastOrderDate: { $max: '$createdAt' },
            },
          },
        ],
        as: 'orderStats',
      },
    },
    {
      $unwind: {
        path: '$orderStats',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        customer: {
          name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$name.firstName', ''] },
                  ' ',
                  { $ifNull: ['$name.lastName', ''] },
                ],
              },
            },
          },
          email: { $ifNull: ['$email', 'N/A'] },
          profilePhoto: { $ifNull: ['$profilePhoto', ''] },
        },
        totalOrders: { $ifNull: ['$orderStats.count', 0] },
        totalSpent: { $ifNull: ['$orderStats.spent', 0] },
        lastOrdered: { $ifNull: ['$orderStats.lastOrderDate', null] },
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
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Customer analytics', isPlural: true },
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
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Vendors performance', isPlural: true },
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
  currentUser: TCurrentUser,
) => {
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    throw new AppError(httpStatus.FORBIDDEN, 'ANALYTICS_ACCESS_DENIED');
  }

  const vendor = await Vendor.findOne({
    userId: vendorUserId,
    isDeleted: false,
  });

  if (!vendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'VENDOR_NOT_FOUND');
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
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Vendor performance' },
    data: {
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
    },
  };
};

// get offer analytics for admin
const getOfferAnalyticsForAdmin = async (currentUser: TCurrentUser) => {
  const now = new Date();

  const last7DaysDate = new Date();
  last7DaysDate.setDate(now.getDate() - 6);
  last7DaysDate.setHours(0, 0, 0, 0);

  const offerFilter: any = {
    isDeleted: false,
  };

  const orderFilter: any = {
    'offer.isApplied': true,
    isDeleted: false,
    orderStatus: { $ne: 'CANCELED' },
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
            { $match: { createdAt: { $gte: last7DaysDate } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                redemptions: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          typeUsage: [
            {
              $group: {
                _id: {
                  $cond: [
                    { $ifNull: ['$offer.offerApplied.bogoSnapshot', false] },
                    'BOGO',
                    {
                      $ifNull: ['$offer.offerApplied.discountType', 'UNKNOWN'],
                    },
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

  const last7DaysArray = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const existingDate = orders.usageOverTime.find(
      (u: any) => u._id === dateStr,
    );
    last7DaysArray.push({
      time: dateStr,
      redemptions: existingDate ? existingDate.redemptions : 0,
    });
  }

  const allTypes = ['PERCENT', 'FLAT', 'FREE_DELIVERY', 'BOGO'];
  const formattedTypeUsage = allTypes.map((type) => {
    const found = orders.typeUsage.find((u: any) => u.name === type);
    return {
      name: type,
      usage: found ? found.usage : 0,
    };
  });

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Offers', isPlural: true },
    data: {
      stats: {
        totalOffers: stats.totalOffers,
        activeOffers: stats.activeOffers,
        totalRedemptions: orders.overall[0]?.totalRedemptions || 0,
        revenueImpact: roundTo2(orders.overall[0]?.revenueImpact || 0),
      },
      usageOverTime: last7DaysArray,
      offerTypeUsage: formattedTypeUsage,
      topOffers: orders.topOffers,
    },
  };
};

// get tax report analytics for vendor
const getTaxReportAnalyticsForVendor = async (currentUser: TCurrentUser) => {
  const now = new Date();
  const start = new Date();
  start.setMonth(now.getMonth() - 5);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const vId = new mongoose.Types.ObjectId(currentUser._id);

  const [result] = await Order.aggregate<any>([
    {
      $match: {
        vendorId: vId,
        orderStatus: 'DELIVERED',
        createdAt: { $gte: start, $lte: now },
      },
    },
    {
      $facet: {
        stats: [
          {
            $group: {
              _id: null,
              totalSales: { $sum: '$payoutSummary.vendor.vendorNetPayout' },
              totalTax: { $sum: '$payoutSummary.vendor.payableTax' },
              netRevenue: { $sum: '$payoutSummary.vendor.earningsWithoutTax' },
            },
          },
        ],

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
        ],

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
          {
            $group: {
              _id: '$allTaxes.rate',
              totalValue: { $sum: '$allTaxes.amount' },
            },
          },
          { $sort: { _id: 1 } },
        ],

        revenueTrend: [
          {
            $group: {
              _id: { $dateToString: { format: '%b', date: '$createdAt' } },
              revenue: { $sum: '$payoutSummary.vendor.earningsWithoutTax' },
              tax: { $sum: '$payoutSummary.vendor.payableTax' },
              sortDate: { $first: '$createdAt' },
            },
          },
          { $sort: { sortDate: 1 } },
        ],

        addonTaxBreakdown: [
          { $unwind: '$items' },
          { $unwind: '$items.addons' },
          {
            $group: {
              _id: '$items.addons.name',
              tax: { $sum: '$items.addons.taxAmount' },
            },
          },
          { $sort: { tax: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);

  const stats = result?.stats[0] || {
    totalSales: 0,
    totalTax: 0,
    netRevenue: 0,
  };
  const contributionRaw = result?.taxContribution[0] || {
    productTax: 0,
    addonTax: 0,
  };

  const totalCalculatedTax =
    contributionRaw.productTax + contributionRaw.addonTax || 1;

  const taxContribution = [
    {
      name: 'Product',
      value: roundTo2((contributionRaw.productTax / totalCalculatedTax) * 100),
    },
    {
      name: 'Addon',
      value: roundTo2((contributionRaw.addonTax / totalCalculatedTax) * 100),
    },
  ];

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Tax Report', isPlural: false },
    data: {
      stats: {
        totalSales: roundTo2(stats.totalSales),
        totalTax: roundTo2(stats.totalTax),
        netRevenue: roundTo2(stats.netRevenue),
      },
      taxContribution,
      taxByCategory: (result?.taxByCategory || []).map((t: any) => ({
        name: `${t._id}%`,
        value: roundTo2(t.totalValue),
      })),
      revenueData: (result?.revenueTrend || []).map((r: any) => ({
        name: r._id,
        revenue: roundTo2(r.revenue),
        tax: roundTo2(r.tax),
      })),
      addonTax: (result?.addonTaxBreakdown || []).map((a: any) => ({
        name: a._id,
        tax: roundTo2(a.tax),
      })),
    },
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
  getTaxReportAnalyticsForVendor,
};
