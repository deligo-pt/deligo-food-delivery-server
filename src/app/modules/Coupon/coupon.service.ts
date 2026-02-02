/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TCoupon } from './coupon.interface';
import { Coupon } from './coupon.model';
import { AuthUser } from '../../constant/user.constant';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { Cart } from '../Cart/cart.model';
import { Product } from '../Product/product.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import mongoose, { Types } from 'mongoose';
import { Order } from '../Order/order.model';
import { ProductCategory } from '../Category/category.model';

// create coupon service
const createCoupon = async (payload: TCoupon, currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`,
    );
  }

  // Normalize code
  payload.code = payload.code.trim().toUpperCase();
  payload.usedCount = payload.usedCount ?? 0;

  const existingCoupon = await Coupon.findOne({
    code: payload.code,
    isDeleted: false,
  });
  if (existingCoupon)
    throw new AppError(httpStatus.BAD_REQUEST, 'Coupon code already exists');

  if (payload.discountType === 'PERCENT' && payload.discountValue > 100) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Percent cannot exceed 100%');
  }

  if (
    payload.discountType === 'FLAT' &&
    payload.minPurchase &&
    payload.discountValue > payload.minPurchase
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Flat discount cannot be more than minimum purchase',
    );
  }

  const now = new Date();
  const validFrom = payload.validFrom ? new Date(payload.validFrom) : now;
  if (!payload.expiresAt) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Expiry date is required');
  }
  const expiresAt = new Date(payload.expiresAt);

  if (expiresAt <= now)
    throw new AppError(httpStatus.BAD_REQUEST, 'Expiry must be a future date');
  if (expiresAt <= validFrom)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Expiry must be after start date',
    );

  const categoryIds =
    payload.applicableCategories?.map(
      (id) => new mongoose.Types.ObjectId(id),
    ) || [];
  const productIds =
    payload.applicableProducts?.map((id) => new mongoose.Types.ObjectId(id)) ||
    [];

  const isVendor =
    currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR';
  const productQuery: any = { _id: { $in: productIds }, isDeleted: false };
  if (isVendor) {
    productQuery.vendorId = currentUser._id.toString();
  }

  const [validCategoriesCount, validProductsCount] = await Promise.all([
    categoryIds.length
      ? ProductCategory.countDocuments({
          _id: { $in: categoryIds },
          isDeleted: false,
        })
      : 0,
    productIds.length ? Product.countDocuments(productQuery) : 0,
  ]);

  if (categoryIds.length && validCategoriesCount !== categoryIds.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'One or more provided categories are invalid or deleted',
    );
  }

  if (productIds.length && validProductsCount !== productIds.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'One or more provided products are invalid or deleted',
    );
  }

  payload.applicableCategories = categoryIds;
  payload.applicableProducts = productIds;

  // Set creator
  if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
    payload.adminId = currentUser._id;
  } else if (
    currentUser.role === 'VENDOR' ||
    currentUser.role === 'SUB_VENDOR'
  ) {
    payload.vendorId = currentUser._id;
    payload.isGlobal = false;
  } else {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only Admins and Vendors can create coupons',
    );
  }

  // Create coupon
  const newCoupon = await Coupon.create(payload);

  return {
    message: `Coupon created successfully by ${currentUser.role}`,
    data: newCoupon,
  };
};

// update coupon service
const updateCoupon = async (
  couponId: string,
  payload: Partial<TCoupon>,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`,
    );
  }

  // Find coupon
  const existingCoupon = await Coupon.findById(couponId);
  if (!existingCoupon)
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  if (existingCoupon.isDeleted)
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot update deleted coupon');

  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);

  if (isVendor) {
    if (
      !existingCoupon.vendorId ||
      existingCoupon.vendorId.toString() !== currentUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Vendors can only update their own coupons',
      );
    }
  }

  // Normalize code
  if (payload.code) {
    payload.code = payload.code.trim().toUpperCase();
    if (payload.code !== existingCoupon.code) {
      const couponWithSameCode = await Coupon.findOne({
        code: payload.code,
        isDeleted: false,
      });
      if (couponWithSameCode)
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'New coupon code already in use',
        );
    }
  }

  const discountType = payload.discountType || existingCoupon.discountType;
  const discountValue = payload.discountValue || existingCoupon.discountValue;

  // Validate discount updates

  if (discountType === 'PERCENT' && discountValue > 100) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Percent discount max 100%');
  }

  const finalExpiresAt = payload.expiresAt
    ? new Date(payload.expiresAt)
    : existingCoupon.expiresAt!;
  const finalValidFrom = payload.validFrom
    ? new Date(payload.validFrom)
    : existingCoupon.validFrom!;

  // Expiry update
  if (payload.expiresAt && finalExpiresAt < new Date()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Expiry must be future date');
  }

  if (finalExpiresAt <= finalValidFrom) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Expiry must be after valid from date',
    );
  }

  // Merge categories
  const categoryIds =
    payload.applicableCategories?.map(
      (id) => new mongoose.Types.ObjectId(id),
    ) || [];
  const productIds =
    payload.applicableProducts?.map((id) => new mongoose.Types.ObjectId(id)) ||
    [];

  if (categoryIds.length > 0 || productIds.length > 0) {
    const productQuery: any = { _id: { $in: productIds }, isDeleted: false };
    if (isVendor) {
      productQuery.vendorId = currentUser._id;
    }
    const [validCategoriesCount, validProductsCount] = await Promise.all([
      categoryIds.length
        ? ProductCategory.countDocuments({
            _id: { $in: categoryIds },
            isDeleted: false,
          })
        : Promise.resolve(0),
      productIds.length
        ? Product.countDocuments(productQuery)
        : Promise.resolve(0),
    ]);

    if (categoryIds.length && validCategoriesCount !== categoryIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'One or more categories are invalid',
      );
    }
    if (productIds.length && validProductsCount !== productIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'One or more products are invalid',
      );
    }

    if (categoryIds.length) payload.applicableCategories = categoryIds;
    if (productIds.length) payload.applicableProducts = productIds;
  }

  // Update coupon
  const updatedCoupon = await Coupon.findByIdAndUpdate(
    couponId,
    { $set: payload },
    {
      new: true,
      runValidators: true,
    },
  );

  return updatedCoupon;
};

// apply coupon service
const applyCoupon = async (
  couponId: string,
  currentUser: AuthUser,
  type: 'CART' | 'CHECKOUT',
) => {
  const coupon = await Coupon.findOne({
    _id: couponId,
    isActive: true,
    isDeleted: false,
  });

  if (!coupon)
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found or inactive');

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This coupon is not yet active');
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This coupon has expired');
  }
  if (coupon.usageLimit && (coupon.usedCount ?? 0) >= coupon.usageLimit) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Coupon usage limit reached');
  }

  let targetDoc: any;
  let items: any[] = [];
  let currentBaseAmount = 0;

  if (type === 'CART') {
    targetDoc = await Cart.findOne({
      customerId: currentUser._id,
      isDeleted: false,
    });
    if (!targetDoc) throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');

    items = targetDoc.items.filter((i: any) => i.isActive);
    currentBaseAmount = items.reduce(
      (sum, item) => sum + item.totalBeforeTax,
      0,
    );
  } else {
    targetDoc = await CheckoutSummary.findOne({
      customerId: currentUser._id,
      isConvertedToOrder: false,
      isDeleted: false,
    }).sort({ createdAt: -1 });
    if (!targetDoc)
      throw new AppError(httpStatus.NOT_FOUND, 'Checkout not found');

    items = targetDoc.items;
    currentBaseAmount = targetDoc.totalPrice;
  }

  if (!items.length)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No items found to apply coupon',
    );

  if (targetDoc.couponId?.toString() === couponId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This coupon is already applied',
    );
  }

  const productIds = items.map((i) => i.productId.toString());
  const dbProducts = await Product.find({ _id: { $in: productIds } });

  if (!coupon.isGlobal && coupon.vendorId) {
    const isOwnerOfAllItems = dbProducts.every(
      (p) => p.vendorId?.toString() === coupon.vendorId?.toString(),
    );
    if (!isOwnerOfAllItems) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This coupon is only valid for a specific vendor',
      );
    }
  }

  if (coupon.applicableCategories?.length) {
    const couponCats = coupon.applicableCategories.map((c) => c.toString());

    const hasValidCategory = dbProducts.some(
      (p: any) => p.category && couponCats.includes(p.category.toString()),
    );

    if (!hasValidCategory) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Coupon not applicable for these categories',
      );
    }
  }

  if (coupon.minPurchase && currentBaseAmount < coupon.minPurchase) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Minimum purchase of ${coupon.minPurchase} required`,
    );
  }

  let discountAmount = 0;
  if (coupon.discountType === 'PERCENT') {
    discountAmount = (currentBaseAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else {
    discountAmount = Math.min(coupon.discountValue, currentBaseAmount);
  }

  discountAmount = parseFloat(discountAmount.toFixed(2));

  targetDoc.discount = discountAmount;
  targetDoc.couponId = new Types.ObjectId(couponId);
  targetDoc.offerId = null;
  targetDoc.promoType = 'COUPON';

  const finalSubtotal = parseFloat(
    (
      currentBaseAmount +
      (targetDoc.taxAmount || 0) +
      (targetDoc.deliveryCharge || 0) +
      (targetDoc.deliveryVatAmount || 0) -
      discountAmount
    ).toFixed(2),
  );

  targetDoc.subtotal = finalSubtotal;

  await targetDoc.save();
  return {
    message: 'Coupon applied successfully',
    data: {
      discount: discountAmount,
      subtotal: targetDoc.subtotal,
      promoType: 'COUPON',
    },
  };
};

// toggle coupon status service
const toggleCouponStatus = async (couponId: string, currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to update coupons. Your account is ${currentUser.status}`,
    );
  }
  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  if (coupon.isDeleted) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot toggle status of a deleted coupon',
    );
  }
  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);
  if (isVendor) {
    if (
      !coupon.vendorId ||
      coupon.vendorId.toString() !== currentUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to update this coupon',
      );
    }
  }

  coupon.isActive = !coupon.isActive;
  await coupon.save();
  return {
    message: `Coupon status updated to ${coupon.isActive ? 'active' : 'inactive'}`,
    data: {
      id: coupon._id,
      isActive: coupon.isActive,
    },
  };
};

// get all coupons analytics service
const getAllCouponsAnalytics = async (currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, `You are not approved.`);
  }

  const orderMatch: any = {
    paymentStatus: 'COMPLETED',
    isDeleted: false,
    couponId: { $exists: true, $ne: null },
  };

  if (['VENDOR', 'SUB_VENDOR'].includes(currentUser.role)) {
    orderMatch.vendorId = currentUser._id;
  }

  const results = await Order.aggregate([
    { $match: orderMatch },
    {
      $group: {
        _id: '$couponId',
        totalCustomerUsage: { $sum: 1 },
        revenueImpact: { $sum: '$discount' },
        allItems: { $push: '$items' },
        orderDates: {
          $push: { date: '$createdAt', discount: '$discount' },
        },
      },
    },
    {
      $lookup: {
        from: 'coupons',
        localField: '_id',
        foreignField: '_id',
        as: 'couponDetails',
      },
    },
    { $unwind: '$couponDetails' },
    {
      $project: {
        _id: 0,
        couponId: '$_id',
        couponCode: '$couponDetails.code',
        discountType: '$couponDetails.discountType',
        totalCustomerUsage: 1,
        revenueImpact: { $round: ['$revenueImpact', 2] },
        allItems: 1,
        orderDates: 1,
      },
    },
  ]);

  const globalMonthlyMap: Record<
    string,
    { month: string; usage: number; revenue: number }
  > = {};

  const allInfluencedProductIds = new Set<string>();
  results.forEach((couponData) => {
    couponData.allItems.flat().forEach((item: any) => {
      allInfluencedProductIds.add(item.productId.toString());
    });
  });

  const productNamesMap = (
    await Product.find({
      _id: { $in: Array.from(allInfluencedProductIds) },
    })
      .select('name')
      .lean()
  ).reduce((map: any, p) => {
    map[p._id.toString()] = p.name;
    return map;
  }, {});

  const finalAnalytics = results.map((couponData) => {
    const itemMap: Record<string, number> = {};

    couponData.allItems.flat().forEach((item: any) => {
      const pid = item.productId.toString();
      itemMap[pid] = (itemMap[pid] || 0) + item.quantity;
    });

    const topItemsInfluenced = Object.entries(itemMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id, qty]) => ({
        name: productNamesMap[id] || 'Unknown',
        quantity: qty,
      }));

    couponData.orderDates.forEach((entry: any) => {
      const d = new Date(entry.date);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!globalMonthlyMap[label]) {
        globalMonthlyMap[label] = { month: label, usage: 0, revenue: 0 };
      }
      globalMonthlyMap[label].usage += 1;
      globalMonthlyMap[label].revenue = Number(
        (globalMonthlyMap[label].revenue + entry.discount).toFixed(2),
      );
    });

    return {
      couponCode: couponData.couponCode,
      discountType: couponData.discountType,
      totalCustomerUsage: couponData.totalCustomerUsage,
      revenueImpact: couponData.revenueImpact,
      topItemsInfluenced,
    };
  });

  const monthlyAnalysis = Object.values(globalMonthlyMap).sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  return {
    coupons: finalAnalytics,
    monthlyAnalytics: monthlyAnalysis,
  };
};

// get single coupon analytics service
const getSingleCouponAnalytics = async (
  couponId: string,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`,
    );
  }

  // --------------------------------------------------
  // Validate coupon
  // --------------------------------------------------
  const coupon = await Coupon.findById(couponId).lean();
  if (!coupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);

  if (isVendor) {
    if (
      !coupon.vendorId ||
      coupon.vendorId.toString() !== currentUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You can only view analytics for your own coupons',
      );
    }
  }

  const couponObjectId = new Types.ObjectId(couponId);

  // --------------------------------------------------
  // Base match (vendor-aware)
  // --------------------------------------------------
  const orderMatch: any = {
    couponId: couponObjectId,
    paymentStatus: 'COMPLETED',
    isDeleted: false,
  };

  if (isVendor) {
    orderMatch.vendorId = currentUser._id;
  }

  // --------------------------------------------------
  // Date ranges
  // --------------------------------------------------
  const now = new Date();

  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - 7);

  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - 14);

  // --------------------------------------------------
  // Usage + Revenue + Boost in ONE query
  // --------------------------------------------------
  const statsAgg = await Order.aggregate([
    { $match: orderMatch },
    {
      $facet: {
        total: [
          {
            $group: {
              _id: null,
              usage: { $sum: 1 },
              revenueImpact: { $sum: '$discount' },
            },
          },
        ],
        current: [
          { $match: { createdAt: { $gte: currentStart } } },
          { $count: 'count' },
        ],
        previous: [
          {
            $match: {
              createdAt: { $gte: previousStart, $lt: currentStart },
            },
          },
          { $count: 'count' },
        ],
      },
    },
  ]);

  const usage = statsAgg[0]?.total[0]?.usage || 0;
  const revenueImpact = Number(
    (statsAgg[0]?.total[0]?.revenueImpact || 0).toFixed(2),
  );

  const currentUsage = statsAgg[0]?.current[0]?.count || 0;
  const previousUsage = statsAgg[0]?.previous[0]?.count || 0;

  let boost = 0;
  if (previousUsage === 0 && currentUsage > 0) boost = 100;
  else if (previousUsage > 0 && currentUsage === 0) boost = -100;
  else if (previousUsage > 0)
    boost = Math.round(((currentUsage - previousUsage) / previousUsage) * 100);

  // --------------------------------------------------
  // Top items
  // --------------------------------------------------
  const topItemsAgg = await Order.aggregate([
    { $match: orderMatch },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        quantity: { $sum: '$items.quantity' },
      },
    },
    { $sort: { quantity: -1 } },
    { $limit: 3 },
  ]);

  const productIds = topItemsAgg.map((i) => i._id);

  const products = await Product.find({
    _id: { $in: productIds },
  })
    .select('name')
    .lean();

  const productMap = new Map(products.map((p) => [p._id.toString(), p.name]));

  const topItems = topItemsAgg.map((i) => ({
    productId: i._id,
    name: productMap.get(i._id.toString()) || 'Unknown',
    quantity: i.quantity,
  }));

  return {
    couponId,
    couponCode: coupon.code,
    usage,
    boost,
    revenueImpact,
    topItems,
  };
};

// get all coupons service
const getAllCoupons = async (
  currentUser: AuthUser,
  query: Record<string, unknown>,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view coupons. Your account is ${currentUser.status}`,
    );
  }
  const filterQuery: Record<string, any> = { ...query };

  if (['VENDOR', 'SUB_VENDOR'].includes(currentUser.role)) {
    filterQuery.vendorId = currentUser._id;
    filterQuery.isDeleted = false;
  }

  const coupons = new QueryBuilder(Coupon.find(), filterQuery)
    .filter()
    .sort()
    .paginate()
    .fields()
    .search(['code', 'description']);

  const populateOptions = getPopulateOptions(currentUser.role, {
    vendor: 'name userId role',
    admin: 'name userId role',
  });
  populateOptions.forEach((option) => {
    coupons.modelQuery = coupons.modelQuery.populate(option);
  });

  const meta = await coupons.countTotal();
  const data = await coupons.modelQuery;

  return { meta, data };
};

// get single coupon service
const getSingleCoupon = async (couponId: string, currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Your account is ${currentUser.status}`,
    );
  }

  const query = Coupon.findById(couponId);

  const populateOptions = getPopulateOptions(currentUser.role, {
    vendor: 'name userId role',
    admin: 'name userId role',
  });

  populateOptions.forEach((option) => {
    query.populate(option);
  });

  const existingCoupon = await query;

  if (!existingCoupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);
  const isOwner =
    existingCoupon.vendorId?.toString() === currentUser._id.toString();

  if (isVendor && !isOwner) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to view this coupon',
    );
  }

  if (existingCoupon.isDeleted && isVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  return existingCoupon;
};

// coupon soft delete service
const softDeleteCoupon = async (couponId: string, currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete a coupon. Your account is ${currentUser.status}`,
    );
  }

  const existingCoupon = await Coupon.findById(couponId);
  if (!existingCoupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  if (!isAdmin) {
    if (existingCoupon.vendorId?.toString() !== currentUser._id.toString()) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to delete this coupon',
      );
    }
  }

  if (existingCoupon?.isDeleted) {
    throw new AppError(httpStatus.CONFLICT, 'Coupon already deleted');
  }

  if (existingCoupon.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please deactivate the coupon before deleting it',
    );
  }

  existingCoupon.isDeleted = true;
  existingCoupon.isActive = false;
  await existingCoupon.save();
  return {
    message: 'Coupon deleted successfully',
  };
};

// coupon permanent delete service
const permanentDeleteCoupon = async (
  couponId: string,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete a coupon. Your account is ${currentUser.status}`,
    );
  }
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only admins can permanently delete coupons',
    );
  }
  const existingCoupon = await Coupon.findById(couponId);
  if (!existingCoupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  if (!existingCoupon.isDeleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Coupon must be soft-deleted before permanent deletion',
    );
  }

  await existingCoupon.deleteOne();
  return {
    message: 'Coupon removed from database permanently',
  };
};

export const CouponServices = {
  createCoupon,
  updateCoupon,
  applyCoupon,
  toggleCouponStatus,
  getAllCouponsAnalytics,
  getSingleCouponAnalytics,
  getAllCoupons,
  getSingleCoupon,
  softDeleteCoupon,
  permanentDeleteCoupon,
};
