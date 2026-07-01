/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import AppError from '../../errors/AppError';
import { TOffer } from './offer.interface';
import { Offer } from './offer.model';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { roundTo2 } from '../../utils/mathProvider';
import {
  calculateOfferDiscount,
  calculateOfferRemoval,
  findAndValidateOffer,
  rebuildCheckoutSummary,
} from './offer.utils';
import { Order } from '../Order/order.model';
import { flattenObject } from '../../utils/flattenObject';
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';
import { TMessageKey } from '../../errors/messages';

// create offer service
const createOffer = async (payload: TOffer, currentUser: TCurrentUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'NOT_AUTHORIZED_WITH_ACCOUNT_STATUS',
      { status: currentUser.status },
    );
  }
  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);
  if (isVendor) {
    payload.vendorId = currentUser._id;
    payload.isGlobal = false;
    payload.adminId = null;
  } else {
    payload.adminId = currentUser._id;
    payload.isGlobal = true;
    payload.vendorId = null;
  }

  // --------------------------------------------
  //  Product Validation & Ownership Check
  // --------------------------------------------
  // if (payload.offerType === 'BOGO' && payload.bogo?.productId) {
  //   const product = await Product.findById(payload.bogo.productId);

  //   if (!product) {
  //     throw new AppError(
  //       httpStatus.NOT_FOUND,
  //       'The specified product for BOGO was not found',
  //     );
  //   }

  //   // If currentUser is a Vendor, ensure they own the product
  //   if (
  //     isVendor &&
  //     product.vendorId.toString() !== currentUser._id.toString()
  //   ) {
  //     throw new AppError(
  //       httpStatus.FORBIDDEN,
  //       'You can only create BOGO offers for your own products',
  //     );
  //   }
  // }

  if (!payload.isAutoApply && payload.code) {
    const existingCode = await Offer.findOne({
      code: payload.code.toUpperCase(),
      isDeleted: false,
    });
    if (existingCode) {
      throw new AppError(httpStatus.CONFLICT, 'OFFER_CODE_ALREADY_EXISTS');
    }
    payload.code = payload.code.toUpperCase();
  }

  // --------------------------------------------
  //  Offer type validation
  // --------------------------------------------
  switch (payload.offerType) {
    case 'BOGO':
      throw new AppError(httpStatus.BAD_REQUEST, 'BOGO_CREATE_DISABLED');
    case 'PERCENT':
    case 'FLAT':
      if (!payload.discountValue || payload.discountValue <= 0) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'VALID_DISCOUNT_VALUE_REQUIRED',
          { offerType: payload.offerType },
        );
      }
      break;

    // case 'BOGO':
    //   if (
    //     !payload.bogo?.buyQty ||
    //     !payload.bogo?.getQty ||
    //     !payload.bogo?.productId
    //   ) {
    //     throw new AppError(
    //       httpStatus.BAD_REQUEST,
    //       'BOGO offer requires buyQty, getQty and a valid productId',
    //     );
    //   }
    //   break;

    case 'FREE_DELIVERY':
      break;

    default:
      throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_OFFER_TYPE');
  }

  // --------------------------------------------
  //  Date validation
  // --------------------------------------------
  const validFrom = new Date(payload.validFrom);
  const expiresAt = new Date(payload.expiresAt);
  if (expiresAt <= validFrom) {
    throw new AppError(httpStatus.BAD_REQUEST, 'END_DATE_AFTER_START_DATE');
  }

  if (expiresAt <= new Date()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'END_DATE_CANNOT_BE_IN_PAST');
  }

  if (payload.isAutoApply) {
    payload.code = undefined;
  }

  // --------------------------------------------
  //  Create Offer
  // --------------------------------------------
  const offer = await Offer.create({
    ...payload,
    validFrom,
    expiresAt,
    usageCount: 0,
    isActive: payload.isActive ?? true,
    isDeleted: false,
  });

  return {
    messageKey: 'OFFER_CREATED_SUCCESS' as TMessageKey,
    data: offer,
  };
};

// update offer service
const updateOffer = async (
  id: string,
  payload: Partial<TOffer>,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_APPROVED_WITH_STATUS', {
      status: currentUser.status,
    });
  }

  // --------------------------------------------------
  // Find offer
  // --------------------------------------------------
  const offer = await Offer.findById(id);
  if (!offer || offer.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'OFFER_NOT_FOUND');
  }

  // --------------------------------------------------
  // Authorization (Vendor can update only own offer)
  // --------------------------------------------------
  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);
  if (isVendor && offer.vendorId?.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_AUTHORIZED_TO_UPDATE_OFFER');
  }

  // --------------------------------------------------
  // Prevent update if offer already expired
  // --------------------------------------------------
  if (offer.expiresAt < new Date() && !payload.expiresAt) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'EXPIRED_OFFER_UPDATE_REQUIRES_DATE_EXTENSION',
    );
  }

  // --------------------------------------------------
  // OfferType based validation
  // --------------------------------------------------
  const offerType = payload.offerType ?? offer.offerType;

  // if (offerType === 'BOGO') {
  //   const productId = payload.bogo?.productId || offer.bogo?.productId;
  //   if (productId && payload.bogo?.productId) {
  //     const product = await Product.findById(productId);
  //     if (
  //       !product ||
  //       (isVendor && product.vendorId.toString() !== currentUser._id.toString())
  //     ) {
  //       throw new AppError(httpStatus.FORBIDDEN, 'Invalid product for BOGO');
  //     }
  //   }
  // }

  if (offerType === 'BOGO') {
    throw new AppError(httpStatus.BAD_REQUEST, 'BOGO_UPDATE_DISABLED');
  }

  const currentAutoApply = payload.isAutoApply ?? offer.isAutoApply;
  if (currentAutoApply) {
    payload.code = null;
  } else {
    if (payload.code) {
      payload.code = payload.code.toUpperCase();
      const duplicate = await Offer.findOne({
        code: payload.code,
        isDeleted: false,
        _id: { $ne: id },
      });
      if (duplicate)
        throw new AppError(httpStatus.CONFLICT, 'CODE_ALREADY_IN_USE');
    } else if (!offer.code) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'CODE_REQUIRED_FOR_MANUAL_OFFERS',
      );
    }
  }

  const validFrom = payload.validFrom
    ? new Date(payload.validFrom)
    : offer.validFrom;
  const expiresAt = payload.expiresAt
    ? new Date(payload.expiresAt)
    : offer.expiresAt;

  if (expiresAt <= validFrom) {
    throw new AppError(httpStatus.BAD_REQUEST, 'END_DATE_AFTER_START_DATE');
  }

  if (payload.offerType && payload.offerType !== offer.offerType) {
    if (payload.offerType === 'BOGO') {
      payload.discountValue = 0;
    } else {
      (payload as any).bogo = null;
    }
  }

  if (offerType === 'PERCENT' && payload.discountValue !== undefined) {
    if (payload.discountValue <= 0 || payload.discountValue > 100) {
      throw new AppError(httpStatus.BAD_REQUEST, 'PERCENTAGE_RANGE_INVALID');
    }
  }

  if (offerType === 'FLAT' && payload.discountValue !== undefined) {
    if (payload.discountValue <= 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'FLAT_DISCOUNT_MUST_BE_POSITIVE',
      );
    }
  }

  if (offerType === 'FREE_DELIVERY') {
    payload.discountValue = 0;
    payload.maxDiscountAmount = 0;
    (payload as any).bogo = null;
  }

  // if (payload.bogo && offer.bogo) {
  //   payload.bogo = { ...offer.bogo, ...payload.bogo };
  // }

  // --------------------------------------------------
  // Usage limits sanity check
  // --------------------------------------------------
  if (
    payload.maxUsageCount !== undefined &&
    payload.maxUsageCount < (offer.usageCount || 0)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'MAX_USAGE_LESS_THAN_CURRENT_USAGE',
    );
  }

  const flattenedPayload = flattenObject(payload);

  // --------------------------------------------------
  // Update offer
  // --------------------------------------------------
  const updatedOffer = await Offer.findByIdAndUpdate(
    id,
    { $set: flattenedPayload },
    {
      new: true,
      runValidators: false,
    },
  );

  return {
    messageKey: 'OFFER_UPDATED_SUCCESS' as TMessageKey,
    data: updatedOffer,
  };
};

// toggle offer status service
const toggleOfferStatus = async (id: string, currentUser: TCurrentUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'ACCOUNT_CANNOT_PERFORM_ACTION', {
      status: currentUser.status,
    });
  }

  const offer = await Offer.findById(id);
  if (!offer) {
    throw new AppError(httpStatus.NOT_FOUND, 'OFFER_NOT_FOUND');
  }

  if (offer.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'CANNOT_TOGGLE_DELETED_OFFER');
  }

  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);

  if (isVendor && offer.vendorId?.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'NOT_AUTHORIZED_TO_CHANGE_OFFER_STATUS',
    );
  }

  if (!offer.isActive && offer.expiresAt < new Date()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'CANNOT_ACTIVATE_EXPIRED_OFFER');
  }

  offer.isActive = !offer.isActive;
  const updatedOffer = await offer.save();
  return {
    messageKey: 'OFFER_STATUS_TOGGLED_SUCCESS' as TMessageKey,
    variables: { isActive: updatedOffer?.isActive },
    data: updatedOffer,
  };
};

// validate and apply offer service
const validateAndApplyOffer = async (
  checkoutId: string,
  offerIdentifier: string,
  currentUser: TCurrentUser,
  lang: TLanguageCode = 'en',
) => {
  const checkoutData = await CheckoutSummary.findById(checkoutId).lean();
  if (!checkoutData)
    throw new AppError(httpStatus.NOT_FOUND, 'CHECKOUT_SESSION_NOT_FOUND');

  if (checkoutData.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'CHECKOUT_DOES_NOT_BELONG_TO_USER',
    );
  }
  if (checkoutData.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'CANNOT_APPLY_OFFER_TO_COMPLETED_CHECKOUT',
    );
  }

  const offer = await findAndValidateOffer(
    offerIdentifier,
    checkoutData,
    currentUser,
  );

  if (!offer) {
    const resetPayload = await calculateOfferRemoval(checkoutData, lang);

    const updatedCheckout = await CheckoutSummary.findByIdAndUpdate(
      checkoutId,
      { $set: resetPayload },
      { new: true },
    ).lean();

    return {
      messageKey: 'OFFER_REMOVED_OR_INVALID' as TMessageKey,
      data: updatedCheckout,
    };
  }

  const discountData = calculateOfferDiscount(offer, checkoutData);

  const updatePayload = await rebuildCheckoutSummary(
    checkoutData,
    offer,
    discountData,
    lang,
  );

  const updatedCheckout = await CheckoutSummary.findByIdAndUpdate(
    checkoutId,
    { $set: updatePayload },
    { new: true, runValidators: true },
  ).lean();

  return {
    messageKey: 'OFFER_APPLIED_SUCCESS' as TMessageKey,
    data: updatedCheckout,
  };
};

// get available offers for checkout service
const getAvailableOffersForCheckout = async (
  checkoutId: string,
  currentUser: TCurrentUser,
) => {
  const checkoutData = await CheckoutSummary.findById(checkoutId).lean();
  if (!checkoutData) {
    throw new AppError(httpStatus.NOT_FOUND, 'CHECKOUT_SESSION_NOT_FOUND');
  }

  const { vendorId, orderCalculation, items } = checkoutData;
  const cartTotal =
    orderCalculation.taxableAmount + (orderCalculation.totalOfferDiscount || 0);
  const now = new Date();

  const baseQuery = {
    isActive: true,
    isDeleted: false,
    validFrom: { $lte: now },
    expiresAt: { $gte: now },
    $or: [{ vendorId: vendorId }, { vendorId: null }, { isGlobal: true }],
  };

  const allOffers = await Offer.find(baseQuery).lean();

  const userOrders = await Order.find({
    customerId: currentUser._id,
    orderStatus: { $ne: 'CANCELLED' },
  })
    .select('offer.offerApplied.promoId')
    .lean();

  const usageMap = userOrders.reduce((acc: any, order: any) => {
    const pId = order.offer?.offerApplied?.promoId?.toString();
    if (pId) acc[pId] = (acc[pId] || 0) + 1;
    return acc;
  }, {});

  const availableOffers = allOffers.map((offer) => {
    const minOrderAmount = offer.minOrderAmount || 0;
    const usageCount = usageMap[offer._id.toString()] || 0;

    const hasApplicableProducts =
      offer.applicableProducts && offer.applicableProducts.length > 0;

    const isProductMatched = hasApplicableProducts
      ? items.some((item: any) => {
          const cartProductId =
            item.productId?._id?.toString() || item.productId?.toString();

          return offer?.applicableProducts?.some(
            (pId: any) => pId.toString() === cartProductId,
          );
        })
      : true;

    const isMinAmountMet = cartTotal >= minOrderAmount;
    const isUsageLimitMet = usageCount < (offer.userUsageLimit || Infinity);

    const isEligible = isMinAmountMet && isUsageLimitMet && isProductMatched;

    let message: TMessageKey = 'OFFER_IS_APPLICABLE';
    let variables: Record<string, string | number | boolean> | undefined;

    if (!isProductMatched) {
      message = 'OFFER_NOT_VALID_FOR_CART_PRODUCTS';
    } else if (!isMinAmountMet) {
      const diff = Math.max(0, roundTo2(minOrderAmount - cartTotal));
      message = 'ADD_MORE_TO_UNLOCK_OFFER';
      variables = { amount: diff };
    } else if (!isUsageLimitMet) {
      message = 'OFFER_USAGE_LIMIT_EXCEEDED';
    }

    return {
      ...offer,
      isEligible,
      message,
      variables,
    };
  });

  return {
    messageKey: 'AVAILABLE_OFFERS_FETCHED_SUCCESS' as TMessageKey,
    data: availableOffers,
  };
};

// get all offers service
const getAllOffers = async (
  currentUser: TCurrentUser,
  query: Record<string, unknown>,
) => {
  const now = new Date();

  if (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR') {
    query.vendorId = currentUser._id;
    query.isDeleted = false;
  }
  if (currentUser.role === 'CUSTOMER') {
    query.isActive = true;
    query.isDeleted = false;

    if (query.isExpired === undefined) {
      query.validFrom = { $lte: now };
      query.expiresAt = { $gte: now };
    }
  }

  if (query.isExpired !== undefined) {
    const isExpired = query.isExpired === 'true' || query.isExpired === true;

    if (isExpired) {
      query.expiresAt = { $lt: now };
    } else {
      query.expiresAt = { $gte: now };
    }

    delete query.isExpired;
  }
  const offers = new QueryBuilder(Offer.find(), query)
    .search(['title.en', 'title.pt', 'code'])
    .filter()
    .sort()
    .paginate()
    .fields();
  const meta = await offers.countTotal();
  const data = await offers.modelQuery;
  return {
    messageKey: 'OFFERS_FETCHED_SUCCESS' as TMessageKey,
    meta,
    data,
  };
};

// get single offer service
const getSingleOffer = async (id: string, currentUser: TCurrentUser) => {
  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isCustomer = currentUser.role === 'CUSTOMER';

  const query: Record<string, any> = { _id: id };

  if (!isAdmin) {
    query.isDeleted = false;
  }

  if (isCustomer) {
    query.isActive = true;
  }

  const offer = await Offer.findOne(query);
  if (!offer) {
    throw new AppError(httpStatus.NOT_FOUND, 'OFFER_NOT_FOUND_OR_UNAVAILABLE');
  }

  if (
    isVendor &&
    offer.vendorId?.toString() !== currentUser._id.toString() &&
    !offer.isGlobal
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_AUTHORIZED_TO_VIEW_OFFER');
  }

  return {
    messageKey: 'OFFER_FETCHED_SUCCESS' as TMessageKey,
    data: offer,
  };
};

// soft delete offer service
const softDeleteOffer = async (id: string, currentUser: TCurrentUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_APPROVED_WITH_STATUS', {
      status: currentUser.status,
    });
  }

  // --------------------------------------------------
  // Find offer
  // --------------------------------------------------
  const offer = await Offer.findById(id);
  if (!offer) {
    throw new AppError(httpStatus.NOT_FOUND, 'OFFER_NOT_FOUND');
  }

  // --------------------------------------------------
  // Prevent duplicate delete
  // --------------------------------------------------
  if (offer.isDeleted) {
    throw new AppError(httpStatus.CONFLICT, 'OFFER_ALREADY_DELETED');
  }

  // --------------------------------------------------
  // Authorization
  // --------------------------------------------------
  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);
  if (isVendor && offer.vendorId?.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_AUTHORIZED_TO_DELETE_OFFER');
  }

  // --------------------------------------------------
  // Prevent deleting active offer
  // --------------------------------------------------
  if (offer.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'ACTIVE_OFFER_MUST_BE_DEACTIVATED_BEFORE_DELETING',
    );
  }

  // --------------------------------------------------
  // Soft delete
  // --------------------------------------------------
  offer.isDeleted = true;
  offer.isActive = false;
  await offer.save();

  return {
    messageKey: 'OFFER_DELETED_SUCCESS' as TMessageKey,
  };
};

// permanent delete offer service
const permanentDeleteOffer = async (id: string, currentUser: TCurrentUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_APPROVED_WITH_STATUS', {
      status: currentUser.status,
    });
  }

  // --------------------------------------------------
  // Only Admin / Super Admin allowed
  // --------------------------------------------------
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  if (!isAdmin) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'ONLY_ADMIN_CAN_PERMANENTLY_DELETE_OFFER',
    );
  }

  // --------------------------------------------------
  // Find offer
  // --------------------------------------------------
  const offer = await Offer.findById(id);
  if (!offer) {
    throw new AppError(httpStatus.NOT_FOUND, 'OFFER_NOT_FOUND');
  }

  // --------------------------------------------------
  // Safety checks
  // --------------------------------------------------
  if (!offer.isDeleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      'SOFT_DELETE_REQUIRED_BEFORE_PERMANENT_DELETE',
    );
  }

  if (offer.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'ACTIVE_OFFER_CANNOT_BE_PERMANENTLY_DELETED',
    );
  }

  // --------------------------------------------------
  // Permanent delete
  // --------------------------------------------------
  await Offer.findByIdAndDelete(id);

  return {
    messageKey: 'OFFER_PERMANENTLY_DELETED_SUCCESS' as TMessageKey,
  };
};
export const OfferServices = {
  createOffer,
  updateOffer,
  toggleOfferStatus,
  validateAndApplyOffer,
  getAvailableOffersForCheckout,
  getAllOffers,
  getSingleOffer,
  softDeleteOffer,
  permanentDeleteOffer,
};
