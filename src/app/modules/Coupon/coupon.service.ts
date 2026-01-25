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
import { Types } from 'mongoose';
import { Order } from '../Order/order.model';

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

  // Set creator
  if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
    payload.adminId = currentUser._id;
  } else if (currentUser.role === 'VENDOR') {
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
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);

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

  if (isAdmin) {
    if (
      !existingCoupon.adminId ||
      existingCoupon.adminId.toString() !== currentUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Admins can only update their own coupons',
      );
    }
  }

  // Normalize code
  if (payload.code) {
    payload.code = payload.code.trim().toUpperCase();
    if (payload.code !== existingCoupon.code) {
      const couponWithSameCode = await Coupon.findOne({ code: payload.code });
      if (couponWithSameCode)
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Coupon code already exists',
        );
    }
  }

  // Validate discount updates
  if (payload.discountValue) {
    if (payload.discountValue <= 0)
      throw new AppError(httpStatus.BAD_REQUEST, 'Discount must be > 0');
    if (payload.discountType === 'PERCENT' && payload.discountValue > 100)
      throw new AppError(httpStatus.BAD_REQUEST, 'Percent discount max 100%');
  }

  // Expiry update
  if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Expiry must be future date');
  }

  // Merge categories
  if (payload.applicableCategories) {
    const cleanExisting = (existingCoupon.applicableCategories || []).map((c) =>
      c.trim(),
    );
    const cleanPayload = payload.applicableCategories.map((c) => c.trim());
    const mergedCategories = [...cleanExisting, ...cleanPayload];

    payload.applicableCategories = [...new Set(mergedCategories)].filter(
      (c) => c !== '',
    );
  }

  // Update coupon
  const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, payload, {
    new: true,
  });

  return updatedCoupon;
};

// apply coupon service
const applyCoupon = async (
  couponId: string,
  currentUser: AuthUser,
  type: 'CART' | 'CHECKOUT',
) => {
  // Find coupon
  const coupon = await Coupon.findOne({
    _id: couponId,
    isActive: true,
    isDeleted: false,
  });
  if (!coupon) throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');

  // Validate timing + usage
  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom)
    throw new AppError(httpStatus.BAD_REQUEST, 'Coupon is not valid yet');

  if (coupon.expiresAt && now > coupon.expiresAt)
    throw new AppError(httpStatus.BAD_REQUEST, 'Coupon expired');

  if (coupon.usageLimit && (coupon.usedCount ?? 0) >= coupon.usageLimit)
    throw new AppError(httpStatus.BAD_REQUEST, 'Coupon usage limit reached');

  // cart flow — active items only
  if (type === 'CART') {
    const cart = await Cart.findOne({
      customerId: currentUser._id,
      isDeleted: false,
    });
    if (!cart) throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');

    // Prevent duplicate apply
    if (cart.couponId?.toString() === couponId.toString()) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This coupon is already applied',
      );
    }

    // Take ONLY ACTIVE items
    const activeItems = cart.items.filter((i) => i.isActive === true);

    if (!activeItems.length) {
      throw new AppError(httpStatus.BAD_REQUEST, 'No active items in cart');
    }

    // recalculate active subtotal (real-time)
    const activeSubtotal = activeItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const finalActiveSubtotal = parseFloat(activeSubtotal.toFixed(2));

    //  category validation from db
    const productIds = activeItems.map((i) => i.productId.toString());
    const products = await Product.find({
      _id: { $in: productIds },
    }).select('productId category');

    // vendor validation
    if (coupon.vendorId) {
      const isVendorProductMatched = products.some(
        (p) => p.vendorId.toString() === coupon.vendorId.toString(),
      );

      if (!isVendorProductMatched) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'This coupon is only valid for specific vendor products',
        );
      }
    }

    const cartCategories = products.map((p) => p.category.toLowerCase());
    const couponCategories =
      coupon.applicableCategories?.map((c) => c.toLowerCase()) || [];

    if (couponCategories.length) {
      const isCategoryMatched = cartCategories.some((cat) =>
        couponCategories.includes(cat),
      );

      if (!isCategoryMatched) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Coupon not applicable for these product categories',
        );
      }
    }

    // min purchase check (active subtotal)
    if (coupon.minPurchase && finalActiveSubtotal < coupon.minPurchase) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Minimum purchase ${coupon.minPurchase} required`,
      );
    }

    // discount calculation (active subtotal)
    let discount = 0;
    if (coupon.discountType === 'PERCENT') {
      discount = (finalActiveSubtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.discountValue;
    }

    // save final values
    cart.discount = parseFloat(discount.toFixed(2));
    cart.couponId = new Types.ObjectId(couponId);
    cart.subtotal = finalActiveSubtotal;
    await cart.save();

    return null;
  }

  // checkout flow — active items only
  if (type === 'CHECKOUT') {
    const checkout = await CheckoutSummary.findOne({
      customerId: currentUser._id,
      isConvertedToOrder: false,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    if (!checkout) {
      throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');
    }

    if (checkout.couponId?.toString() === couponId.toString()) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This coupon is already applied',
      );
    }

    const products = await Product.find({
      _id: { $in: checkout.items.map((i) => i.productId) },
    }).select('productId category');
    const cartCategories = products.map((p) => p.category.toLowerCase());

    const couponCategories =
      coupon.applicableCategories?.map((c) => c.toLowerCase()) || [];

    if (couponCategories.length) {
      const isCategoryMatched = cartCategories.some((cat) =>
        couponCategories.includes(cat),
      );

      if (!isCategoryMatched) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Coupon not applicable for these product categories',
        );
      }
    }

    const checkOutTotalPrice = checkout.totalPrice;
    // min purchase check (active)
    if (coupon.minPurchase && checkOutTotalPrice < coupon.minPurchase) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Minimum purchase ${coupon.minPurchase} required`,
      );
    }

    // discount calculation
    let discount = 0;
    if (coupon.discountType === 'PERCENT') {
      discount = (checkOutTotalPrice * coupon.discountValue) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.discountValue;
    }

    const subTotal = checkOutTotalPrice - discount + checkout.deliveryCharge;

    // final save
    checkout.totalPrice = checkOutTotalPrice;
    checkout.discount = parseFloat(discount.toFixed(2));
    checkout.couponId = new Types.ObjectId(couponId);
    checkout.subTotal = parseFloat(subTotal.toFixed(2));
    await checkout.save();

    return null;
  }

  return null;
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
  if (
    (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR') &&
    coupon.vendorId.toString() !== currentUser._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this coupon',
    );
  }

  coupon.isActive = !coupon.isActive;
  await coupon.save();
  return {
    message: `Coupon status updated to ${
      coupon.isActive ? 'active' : 'inactive'
    } `,
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
        // monthlyRaw: {
        //   $push: {
        //     date: '$createdAt',
        //     discount: '$discount',
        //   },
        // },
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

  const finalAnalytics = await Promise.all(
    results.map(async (couponData) => {
      const itemMap: Record<string, number> = {};
      couponData.allItems.flat().forEach((item: any) => {
        const pid = item.productId.toString();
        itemMap[pid] = (itemMap[pid] || 0) + item.quantity;
      });

      const topItemEntries = Object.entries(itemMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      const productDetails = await Product.find({
        _id: { $in: topItemEntries.map(([id]) => id) },
      })
        .select('name')
        .lean();

      const topItemsInfluenced = topItemEntries.map(([id, qty]) => ({
        name:
          productDetails.find((p) => p._id.toString() === id)?.name ||
          'Unknown',
        quantity: qty,
      }));

      couponData.orderDates.forEach((entry: any) => {
        const d = new Date(entry.date);
        const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0',
        )}`;

        if (!globalMonthlyMap[label]) {
          globalMonthlyMap[label] = { month: label, usage: 0, revenue: 0 };
        }
        globalMonthlyMap[label].usage += 1;
        globalMonthlyMap[label].revenue += entry.discount;
      });

      return {
        couponCode: couponData.couponCode,
        discountType: couponData.discountType,
        totalCustomerUsage: couponData.totalCustomerUsage,
        revenueImpact: couponData.revenueImpact,
        topItemsInfluenced,
      };
    }),
  );

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

  const couponObjectId = new Types.ObjectId(couponId);

  // --------------------------------------------------
  // Base match (vendor-aware)
  // --------------------------------------------------
  const orderMatch: any = {
    couponId: couponObjectId,
    paymentStatus: 'COMPLETED',
    isDeleted: false,
  };

  if (['VENDOR', 'SUB_VENDOR'].includes(currentUser.role)) {
    orderMatch.vendorId = currentUser._id;
  }

  // --------------------------------------------------
  // Date ranges
  // --------------------------------------------------
  const now = new Date();

  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - 7);

  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - 7);

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
  // Top items (separate but indexed)
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

  // --------------------------------------------------
  // Final response
  // --------------------------------------------------
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

  const coupons = new QueryBuilder(Coupon.find(), query)
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
      `You are not approved to view a coupon. Your account is ${currentUser.status}`,
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

  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    if (existingCoupon.vendorId !== currentUser._id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to delete this coupon',
      );
    }
  }

  if (existingCoupon?.isDeleted === true) {
    throw new AppError(httpStatus.CONFLICT, 'Coupon already deleted');
  }

  if (existingCoupon.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Active coupons cannot be deleted',
    );
  }

  existingCoupon.isDeleted = true;
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
  const existingCoupon = await Coupon.findById(couponId);
  if (!existingCoupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  if (existingCoupon?.isDeleted === false) {
    throw new AppError(httpStatus.CONFLICT, 'Please soft delete first');
  }

  await existingCoupon.deleteOne();
  return {
    message: 'Coupon deleted permanently',
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
