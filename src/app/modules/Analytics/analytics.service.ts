import { Customer } from '../Customer/customer.model';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { Order } from '../Order/order.model';
import { Product } from '../Product/product.model';
import { Vendor } from '../Vendor/vendor.model';

const getOverview = async () => {
  const customers = await Customer.countDocuments();
  const vendors = await Vendor.countDocuments();
  const totalOrders = await Order.countDocuments();

  const pendingOrders = await Order.countDocuments({ orderStatus: 'PENDING' });
  const completedOrders = await Order.countDocuments({
    orderStatus: 'DELIVERED',
  });
  const cancelledOrders = await Order.countDocuments({
    orderStatus: 'CANCELLED',
  });

  const totalRevenueData = await Order.aggregate([
    { $match: { paymentStatus: 'COMPLETED' } },
    { $group: { _id: null, total: { $sum: '$finalAmount' } } },
  ]);

  const todaysRevenueData = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'COMPLETED',
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    },
    { $group: { _id: null, total: { $sum: '$finalAmount' } } },
  ]);

  return {
    customers,
    vendors,
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue: totalRevenueData[0]?.total || 0,
    todaysRevenue: todaysRevenueData[0]?.total || 0,
  };
};

const getMonthlyOrders = async (year: number) => {
  console.log(year);
  const data = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { month: { $month: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: '$finalAmount' },
      },
    },
    { $sort: { '_id.month': 1 } },
  ]);

  return data;
};

const getVendorStats = async () => {
  const data = await Order.aggregate([
    {
      $group: {
        _id: '$vendorId',
        orders: { $sum: 1 },
        revenue: { $sum: '$finalAmount' },
      },
    },
    {
      $lookup: {
        from: 'vendors',
        localField: '_id',
        foreignField: '_id',
        as: 'vendor',
      },
    },
    { $unwind: '$vendor' },
    {
      $project: {
        vendorName: '$vendor.name',
        orders: 1,
        revenue: 1,
      },
    },
  ]);

  return data;
};

const getFleetManagerAnalytics = async (fleetManagerId: string) => {
  const totalDeliveryPartners = await DeliveryPartner.countDocuments({
    registeredBy: fleetManagerId,
  });

  const partners = await DeliveryPartner.find({
    registeredBy: fleetManagerId,
  }).select('_id');
  const deliveryPartnerIds = partners.map((p) => p._id);

  const totalOrdersAssigned = await Order.countDocuments({
    deliveryPartnerId: { $in: deliveryPartnerIds },
  });

  const pendingOrders = await Order.countDocuments({
    deliveryPartnerId: { $in: deliveryPartnerIds },
    orderStatus: 'PENDING',
  });

  const completedOrders = await Order.countDocuments({
    deliveryPartnerId: { $in: deliveryPartnerIds },
    orderStatus: 'COMPLETED',
  });

  const cancelledOrders = await Order.countDocuments({
    deliveryPartnerId: { $in: deliveryPartnerIds },
    orderStatus: 'CANCELLED',
  });

  const inProgressOrders = await Order.countDocuments({
    deliveryPartnerId: { $in: deliveryPartnerIds },
    orderStatus: 'ON_THE_WAY',
  });

  const topRatedDeliveryPartners = await DeliveryPartner.aggregate([
    { $match: { fleetManagerId } },
    {
      $project: {
        name: 1,
        rating: 1,
        completedDeliveries: 1,
      },
    },
    { $sort: { rating: -1, completedDeliveries: -1 } },
    { $limit: 5 },
  ]);

  return {
    totalDeliveryPartners,
    totalOrdersAssigned,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    inProgressOrders,
    topRatedDeliveryPartners,
  };
};

const getVendorAnalytics = async (vendorId: string) => {
  const totalProducts = await Product.countDocuments({
    'vendor.vendorId': vendorId,
  });

  const products = await Product.find({ 'vendor.vendorId': vendorId }).select(
    '_id category rating'
  );
  const productIds = products.map((p) => p._id);

  const totalOrders = await Order.countDocuments({
    'items.productId': { $in: productIds },
  });

  const pendingOrders = await Order.countDocuments({
    'items.productId': { $in: productIds },
    orderStatus: 'PENDING',
  });

  const completedOrders = await Order.countDocuments({
    'items.productId': { $in: productIds },
    orderStatus: 'DELIVERED',
  });

  const cancelledOrders = await Order.countDocuments({
    'items.productId': { $in: productIds },
    orderStatus: 'CANCELLED',
  });

  const categoryStats = await Order.aggregate([
    { $match: { 'items.productId': { $in: productIds } } },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $in: productIds } } },
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
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 1 },
  ]);

  const mostOrderedCategory = categoryStats[0]?._id || null;

  const topRatedProducts = await Product.find({ vendorId })
    .sort({ rating: -1 })
    .limit(5)
    .select('name price rating category');

  return {
    totalProducts,
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    mostOrderedCategory,
    topRatedProducts,
  };
};

export const AnalyticsServices = {
  getOverview,
  getMonthlyOrders,
  getVendorStats,
  getFleetManagerAnalytics,
  getVendorAnalytics,
};
