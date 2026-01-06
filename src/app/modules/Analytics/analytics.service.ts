import { Types } from 'mongoose';
import { AuthUser } from '../../constant/user.constant';
import { Customer } from '../Customer/customer.model';
import { currentStatusOptions } from '../Delivery-Partner/delivery-partner.constant';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { FleetManager } from '../Fleet-Manager/fleet-manager.model';
import { Order } from '../Order/order.model';
import { Product } from '../Product/product.model';
import { Vendor } from '../Vendor/vendor.model';

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
    cancelledOrders,
  ] = await Promise.all([
    Customer.countDocuments(),
    Vendor.countDocuments(),
    FleetManager.countDocuments(),
    DeliveryPartner.countDocuments(),
    Product.countDocuments({ isDeleted: false }),
    Order.countDocuments(),
    Order.countDocuments({ orderStatus: 'PENDING' }),
    Order.countDocuments({ orderStatus: 'DELIVERED' }),
    Order.countDocuments({ orderStatus: 'CANCELLED' }),
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
      $project: {
        name: '$_id',
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

  const topRatedItems = await Product.find({ rating: { $gte: 4 } })
    .sort({ rating: -1 })
    .limit(4)
    .select('name rating images totalOrders');

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
      cancelled: cancelledOrders,
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
    '_id category rating meta.status'
  );

  const productIds = products.map((p) => p._id);

  // --------------------------------------------------
  // Order Counts
  // --------------------------------------------------
  const [totalOrders, pendingOrders, completedOrders, cancelledOrders] =
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
              name: '$categories._id',
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
  const topRatedItems = products
    .filter((p) => p.rating?.average && p.rating.average >= 4)
    .sort((a, b) => (b.rating?.average ?? 0) - (a.rating?.average ?? 0))
    .slice(0, 4);

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
      cancelled: cancelledOrders,
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
    registeredBy: managerId,
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
      registeredBy: managerId,
      isDeleted: false,
    }),

    DeliveryPartner.countDocuments({
      registeredBy: managerId,
      'operationalData.currentStatus': { $ne: currentStatusOptions.OFFLINE },
      isDeleted: false,
    }),

    Order.countDocuments({
      orderStatus: 'DELIVERED',
      createdAt: { $gte: startOfDay },
      deliveryPartnerId: { $in: partnerIds },
    }),

    DeliveryPartner.aggregate([
      { $match: { registeredBy: managerId, isDeleted: false } },
      { $group: { _id: '$vehicleInfo.vehicleType', count: { $sum: 1 } } },
    ]),

    DeliveryPartner.aggregate([
      { $match: { registeredBy: managerId, isDeleted: false } },
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
    registeredBy: managerId,
    isDeleted: false,
    'operationalData.rating.average': { $exists: true, $gt: 0 },
  })
    .sort({ 'operationalData.rating.average': -1 })
    .limit(4)
    .select(
      'name personalInfo.gender operationalData.rating nationality operationalData.completedDeliveries vehicleInfo'
    );

  if (!topDrivers.length) {
    topDrivers = await DeliveryPartner.find({
      registeredBy: managerId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .select(
        'name personalInfo.gender operationalData.rating nationality operationalData.completedDeliveries vehicleInfo'
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

const getPartnerPerformanceAnalytics = async (
  currentUser: AuthUser,
  query: { timeframe?: string; page?: number; limit?: number }
) => {
  const managerId = new Types.ObjectId(currentUser._id);
  const { timeframe = 'last14days', page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const endDate = new Date();
  const startDate = new Date();
  const days = timeframe === 'last14days' ? 14 : 7;
  startDate.setDate(endDate.getDate() - days);

  const myPartners = await DeliveryPartner.find({
    registeredBy: managerId,
    isDeleted: false,
  }).select('_id');

  const partnerIds = myPartners.map((p) => p._id);

  const [orderStats, topPartnerAggregation, tableData, totalPartnersCount] =
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

      DeliveryPartner.find({
        registeredBy: managerId,
        isDeleted: false,
      })
        .sort({ 'operationalData.completedDeliveries': -1 })
        .skip(skip)
        .limit(limit)
        .select('name address.city operationalData vehicleInfo userId'),

      DeliveryPartner.countDocuments({
        registeredBy: managerId,
        isDeleted: false,
      }),
    ]);

  const stats = orderStats[0] || { totalEarnings: 0, avgTimeMs: 0 };
  const avgDeliveryTimeMin = stats.avgTimeMs
    ? Math.round(stats.avgTimeMs / 60000)
    : 0;

  return {
    cards: {
      topPartnerDeliveries: topPartnerAggregation[0]?.count || 0,
      avgDeliveryTime: `${avgDeliveryTimeMin} min`,
      avgAcceptanceRate: '91%',
      totalEarnings: `€${stats.totalEarnings.toFixed(2)}`,
    },
    table: {
      data: tableData.map((partner) => ({
        id: partner._id,
        name: `${partner?.name?.firstName} ${partner?.name?.lastName}`,
        displayId: partner.userId,
        vehicle: partner?.vehicleInfo?.vehicleType,
        city: partner?.address?.city || 'N/A',
        deliveries: partner?.operationalData?.completedDeliveries,
        avgMins: '22 min',
        acceptance: '96%',
        earnings: `€${(partner?.operationalData?.totalEarnings || 0).toFixed(
          2
        )}`,
      })),
      meta: {
        total: totalPartnersCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalPartnersCount / limit),
      },
    },
  };
};

export const AnalyticsServices = {
  getAdminDashboardAnalytics,
  getVendorDashboardAnalytics,
  getFleetDashboardAnalytics,
  getPartnerPerformanceAnalytics,
};
