import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TCoupon } from './coupon.interface';
import { Coupon } from './coupon.model';
import { AuthUser } from '../../constant/user.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { Cart } from '../Cart/cart.model';
import { Product } from '../Product/product.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';

// create coupon service
const createCoupon = async (payload: TCoupon, currentUser: AuthUser) => {
  // Find logged in user
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result.user;

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${loggedInUser.status}`
    );
  }

  // Normalize code
  payload.code = payload.code.trim().toUpperCase();
  payload.usedCount = payload.usedCount ?? 0;

  // Discount validations
  if (payload.discountValue <= 0)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Discount must be greater than 0'
    );
  if (payload.discountType === 'PERCENT' && payload.discountValue > 100)
    throw new AppError(httpStatus.BAD_REQUEST, 'Percent cannot exceed 100%');
  if (
    payload.discountType === 'FLAT' &&
    payload.minPurchase &&
    payload.discountValue > payload.minPurchase
  )
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Flat discount cannot exceed min purchase'
    );

  // Expiry validation
  if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Expiry must be future date');
  }

  // Check duplicate code
  const existingCoupon = await Coupon.findOne({ code: payload.code });
  if (existingCoupon)
    throw new AppError(httpStatus.BAD_REQUEST, 'Coupon already exists');

  // Set creator
  if (loggedInUser.role === 'ADMIN' || loggedInUser.role === 'SUPER_ADMIN') {
    payload.adminId = loggedInUser._id;
  } else if (loggedInUser.role === 'VENDOR') {
    payload.vendorId = loggedInUser._id;
  }

  // Create coupon
  const newCoupon = await Coupon.create(payload);

  return {
    message: `Coupon created successfully by ${loggedInUser.role}`,
    data: newCoupon,
  };
};

// update coupon service
const updateCoupon = async (
  couponId: string,
  payload: Partial<TCoupon>,
  currentUser: AuthUser
) => {
  // Find user
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result.user;
  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${loggedInUser.status}`
    );
  }

  // Find coupon
  const existingCoupon = await Coupon.findById(couponId);
  if (!existingCoupon)
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  if (existingCoupon.isDeleted)
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot update deleted coupon');

  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(loggedInUser.role);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(loggedInUser.role);

  if (isVendor) {
    if (
      !existingCoupon.vendorId ||
      existingCoupon.vendorId.toString() !== loggedInUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Vendors can only update their own coupons'
      );
    }
  }

  if (isAdmin) {
    if (
      !existingCoupon.adminId ||
      existingCoupon.adminId.toString() !== loggedInUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Admins can only update their own coupons'
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
          'Coupon code already exists'
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
      c.trim()
    );
    const cleanPayload = payload.applicableCategories.map((c) => c.trim());
    const mergedCategories = [...cleanExisting, ...cleanPayload];

    payload.applicableCategories = [...new Set(mergedCategories)].filter(
      (c) => c !== ''
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
  code: string,
  currentUser: AuthUser,
  type: 'CART' | 'CHECKOUT'
) => {
  // Ensure user exists
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });

  code = code.trim().toUpperCase();

  // Find coupon
  const coupon = await Coupon.findOne({
    code,
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
      customerId: currentUser.id,
      isDeleted: false,
    });

    if (!cart) throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');

    // Prevent duplicate apply
    if (cart.couponCode === code) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This coupon is already applied'
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
      0
    );
    const finalActiveSubtotal = parseFloat(activeSubtotal.toFixed(2));

    //  category validation from db
    const productIds = activeItems.map((i) => i.productId);
    const products = await Product.find({
      productId: { $in: productIds },
    }).select('productId category');

    // vendor validation
    if (coupon.vendorId) {
      const isVendorProductMatched = products.some(
        (p) => p.vendorId.toString() === coupon.vendorId.toString()
      );

      if (!isVendorProductMatched) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'This coupon is only valid for specific vendor products'
        );
      }
    }

    const cartCategories = products.map((p) => p.category.toLowerCase());
    const couponCategories =
      coupon.applicableCategories?.map((c) => c.toLowerCase()) || [];

    if (couponCategories.length) {
      const isCategoryMatched = cartCategories.some((cat) =>
        couponCategories.includes(cat)
      );

      if (!isCategoryMatched) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Coupon not applicable for these product categories'
        );
      }
    }

    // min purchase check (active subtotal)
    if (coupon.minPurchase && finalActiveSubtotal < coupon.minPurchase) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Minimum purchase ${coupon.minPurchase} required`
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
    cart.couponCode = code;
    cart.totalPrice = finalActiveSubtotal;
    await cart.save();

    return null;
  }

  // checkout flow — active items only
  if (type === 'CHECKOUT') {
    const checkout = await CheckoutSummary.findOne({
      customerId: currentUser.id,
      isConvertedToOrder: false,
      isDeleted: false,
    });

    if (!checkout) {
      throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');
    }

    if (checkout.couponCode === code) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This coupon is already applied'
      );
    }

    const products = await Product.find({
      productId: { $in: checkout.items.map((i) => i.productId) },
    }).select('productId category');

    const cartCategories = products.map((p) => p.category.toLowerCase());
    const couponCategories =
      coupon.applicableCategories?.map((c) => c.toLowerCase()) || [];

    if (couponCategories.length) {
      const isCategoryMatched = cartCategories.some((cat) =>
        couponCategories.includes(cat)
      );

      if (!isCategoryMatched) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Coupon not applicable for these product categories'
        );
      }
    }

    const checkOutTotalPrice = checkout.totalPrice;
    // min purchase check (active)
    if (coupon.minPurchase && checkOutTotalPrice < coupon.minPurchase) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Minimum purchase ${coupon.minPurchase} required`
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

    const finalAmount = checkOutTotalPrice - discount + checkout.deliveryCharge;

    // final save
    checkout.totalPrice = checkOutTotalPrice;
    checkout.discount = parseFloat(discount.toFixed(2));
    checkout.couponCode = code;
    checkout.finalAmount = parseFloat(finalAmount.toFixed(2));
    await checkout.save();

    return null;
  }

  return null;
};

// toggle coupon status service
const toggleCouponStatus = async (couponId: string, currentUser: AuthUser) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result.user;
  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to update coupons. Your account is ${loggedInUser.status}`
    );
  }
  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }
  if (
    (loggedInUser.role === 'VENDOR' || loggedInUser.role === 'SUB_VENDOR') &&
    coupon.vendorId.toString() !== loggedInUser._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this coupon'
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

// get all coupons service
const getAllCoupons = async (
  currentUser: AuthUser,
  query: Record<string, unknown>
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result.user;
  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view coupons. Your account is ${loggedInUser.status}`
    );
  }

  const coupons = new QueryBuilder(Coupon.find(), query)
    .filter()
    .sort()
    .paginate()
    .fields()
    .search(['code', 'description']);

  const populateOptions = getPopulateOptions(loggedInUser.role, {
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
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result.user;
  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view a coupon. Your account is ${loggedInUser.status}`
    );
  }

  const query = Coupon.findById(couponId);

  const populateOptions = getPopulateOptions(loggedInUser.role, {
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
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const loggedInUser = result.user;

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete a coupon. Your account is ${loggedInUser.status}`
    );
  }

  const existingCoupon = await Coupon.findById(couponId);
  if (!existingCoupon) {
    throw new AppError(httpStatus.NOT_FOUND, 'Coupon not found');
  }

  if (loggedInUser.role !== 'ADMIN' && loggedInUser.role !== 'SUPER_ADMIN') {
    if (existingCoupon.vendorId !== loggedInUser._id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to delete this coupon'
      );
    }
  }

  if (existingCoupon?.isDeleted === true) {
    throw new AppError(httpStatus.CONFLICT, 'Coupon already deleted');
  }

  if (existingCoupon.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Active coupons cannot be deleted'
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
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const loggedInUser = result.user;

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete a coupon. Your account is ${loggedInUser.status}`
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
  getAllCoupons,
  getSingleCoupon,
  softDeleteCoupon,
  permanentDeleteCoupon,
};
