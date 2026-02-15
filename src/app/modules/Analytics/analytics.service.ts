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

  const topRatedItems = await Product.find({ 'rating.average': { $gte: 4 } })
    .sort({ 'rating.average': -1 })
    .limit(4)
    .select('name rating images totalOrders')
    .lean();

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
        vendorId: new mongoose.Types.ObjectId(vendorId),
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

export const AnalyticsServices = {
  getAdminDashboardAnalytics,
  getVendorDashboardAnalytics,
  getFleetDashboardAnalytics,
  getPartnerPerformanceAnalytics,
};
