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
  getBogoEligibleFreeQty,
  getBogoTriggerLabel,
  getBogoTriggerQty,
  rebuildCheckoutSummary,
  resolveBogoTriggerProductIds,
} from './offer.utils';
import { Order } from '../Order/order.model';
import { Product } from '../Product/product.model';
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

    case 'BOGO': {
      // BOGO is a vendor-only promotion type — admins cannot create BOGO offers
      if (!isVendor) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'BOGO_CREATION_RESTRICTED_TO_VENDOR',
        );
      }

      const bogo = payload.bogo;
      if (
        !bogo?.buyQty ||
        !bogo?.getQty ||
        (!bogo?.buyProductId && !bogo?.buyCategoryId)
      ) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'BOGO_REQUIRES_BUY_TRIGGER_AND_QUANTITIES',
        );
      }

      // Vendors may only target products they own
      if (bogo.buyProductId) {
        const buyProduct = await Product.findById(bogo.buyProductId);
        if (
          !buyProduct ||
          buyProduct.vendorId.toString() !== currentUser._id.toString()
        ) {
          throw new AppError(
            httpStatus.FORBIDDEN,
            'BOGO_BUY_PRODUCT_NOT_OWNED',
          );
        }
      }
      if (bogo.getProductId) {
        const getProduct = await Product.findById(bogo.getProductId);
        if (
          !getProduct ||
          getProduct.vendorId.toString() !== currentUser._id.toString()
        ) {
          throw new AppError(
            httpStatus.FORBIDDEN,
            'BOGO_GET_PRODUCT_NOT_OWNED',
          );
        }
      }
      payload.discountValue = 0;
      break;
    }

    case 'FREE_DELIVERY':
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'FREE_DELIVERY_CREATION_DISABLED',
      );

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
    messageKey: 'COMMON_CREATED_SUCCESS',
    variables: { entity: 'Offer' },
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
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Offer',
    });
  }

  // --------------------------------------------------
  // Authorization (Vendor can update only own offer)
  // --------------------------------------------------
  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);
  if (isVendor && offer.vendorId?.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_UNAUTHORIZED_ACTION', {
      action: 'update this offer',
    });
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

  // BOGO is a vendor-only promotion type — admins cannot create or manage BOGO offers
  if (offerType === 'BOGO' && !isVendor) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'BOGO_CREATION_RESTRICTED_TO_VENDOR',
    );
  }

  if (offerType === 'BOGO' && payload.bogo) {
    const buyProductId = payload.bogo.buyProductId;
    if (buyProductId) {
      const buyProduct = await Product.findById(buyProductId);
      if (
        !buyProduct ||
        buyProduct.vendorId.toString() !== currentUser._id.toString()
      ) {
        throw new AppError(httpStatus.FORBIDDEN, 'BOGO_BUY_PRODUCT_NOT_OWNED');
      }
    }
    if (payload.bogo.getProductId) {
      const getProduct = await Product.findById(payload.bogo.getProductId);
      if (
        !getProduct ||
        getProduct.vendorId.toString() !== currentUser._id.toString()
      ) {
        throw new AppError(httpStatus.FORBIDDEN, 'BOGO_GET_PRODUCT_NOT_OWNED');
      }
    }
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
    throw new AppError(httpStatus.BAD_REQUEST, 'FREE_DELIVERY_UPDATE_DISABLED');
  }

  // Merge partial bogo updates onto the existing bogo config
  if (payload.bogo && offer.bogo) {
    const plainOffer = offer.toObject();

    payload.bogo = {
      ...plainOffer.bogo,
      ...payload.bogo,
    };
  }

  if (offerType === 'BOGO') {
    const bogo = payload.bogo ?? offer.bogo;
    if (
      !bogo?.buyQty ||
      !bogo?.getQty ||
      (!bogo.buyProductId && !bogo.buyCategoryId)
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'BOGO_REQUIRES_BUY_TRIGGER_AND_QUANTITIES',
      );
    }
  }

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
    messageKey: 'COMMON_UPDATED_SUCCESS',
    variables: { entity: 'Offer' },
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
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Offer',
    });
  }

  if (offer.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'CANNOT_TOGGLE_DELETED_OFFER');
  }

  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);

  if (isVendor && offer.vendorId?.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_UNAUTHORIZED_ACTION', {
      action: 'change the status of this offer',
    });
  }

  if (!offer.isActive && offer.expiresAt < new Date()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'CANNOT_ACTIVATE_EXPIRED_OFFER');
  }

  offer.isActive = !offer.isActive;
  const updatedOffer = await offer.save();
  return {
    messageKey: 'OFFER_STATUS_TOGGLED_SUCCESS',
    variables: { isActive: updatedOffer?.isActive },
    data: updatedOffer,
  };
};

const validateAndApplyOffer = async (
  checkoutId: string,
  offerIdentifier: string,
  currentUser: TCurrentUser,
  lang: TLanguageCode = 'en',
) => {
  let checkoutData = await CheckoutSummary.findById(checkoutId).lean();
  if (!checkoutData)
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Checkout Session',
    });

  if (checkoutData.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED', {
      reason: 'This checkout session belongs to another profile.',
    });
  }
  if (checkoutData.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'CANNOT_APPLY_OFFER_TO_COMPLETED_CHECKOUT',
    );
  }

  const inputCodeClean = offerIdentifier.trim().toUpperCase();
  const alreadyAppliedCode = checkoutData.offer?.offerApplied?.code
    ?.trim()
    .toUpperCase();

  // Anti-Duplicate Guard: Prevent consecutive calculation hits for the same token
  if (checkoutData.offer?.isApplied && alreadyAppliedCode === inputCodeClean) {
    return {
      messageKey: 'OFFER_APPLIED_SUCCESS' as TMessageKey,
      variables: undefined,
      data: checkoutData,
    };
  }

  // State Healing Engine: Rollback cart to pristine state if a different code is applied
  if (checkoutData.offer?.isApplied) {
    const freshCleanPayload = await calculateOfferRemoval(
      checkoutData as any,
      lang,
    );
    checkoutData = {
      ...checkoutData,
      ...freshCleanPayload,
    } as any;
  }

  const offer = await findAndValidateOffer(
    offerIdentifier,
    checkoutData,
    currentUser,
    lang,
  );

  if (!offer) {
    const resetPayload = await calculateOfferRemoval(checkoutData as any, lang);

    if (resetPayload.offer && resetPayload.offer.offerApplied === null) {
      (resetPayload.offer as any).offerApplied = undefined;
    }

    const updatedCheckout = await CheckoutSummary.findByIdAndUpdate(
      checkoutId,
      { $set: resetPayload as any },
      { new: true },
    ).lean();

    return {
      messageKey: 'OFFER_REMOVED_OR_INVALID' as TMessageKey,
      variables: undefined,
      data: updatedCheckout,
    };
  }

  const discountData = await calculateOfferDiscount(offer, checkoutData, lang);
  const updatePayload = await rebuildCheckoutSummary(
    checkoutData,
    offer,
    discountData,
    lang,
  );

  if (updatePayload.offer && updatePayload.offer.offerApplied === null) {
    (updatePayload.offer as any).offerApplied = undefined;
  }

  const updatedCheckout = await CheckoutSummary.findByIdAndUpdate(
    checkoutId,
    { $set: updatePayload as any },
    { new: true, runValidators: true },
  ).lean();

  return {
    messageKey: 'OFFER_APPLIED_SUCCESS' as TMessageKey,
    variables: undefined,
    data: updatedCheckout,
  };
};

// get available offers for checkout service
const getAvailableOffersForCheckout = async (
  checkoutId: string,
  currentUser: TCurrentUser,
  lang: TLanguageCode = 'en',
) => {
  const checkoutData = await CheckoutSummary.findById(checkoutId).lean();
  if (!checkoutData) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Checkout Session',
    });
  }

  // SECURITY CHECK: Ensure the customer can only access their own checkout session offers
  if (checkoutData.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_UNAUTHORIZED_ACTION', {
      action: 'view this checkout session',
    });
  }

  const { vendorId, orderCalculation, items } = checkoutData;

  const cartTotal =
    (orderCalculation.itemsSubtotal || 0) +
    (orderCalculation.totalOfferDiscount || 0);

  const now = new Date();

  // Optimized base query for date-time matching
  const baseQuery = {
    isActive: true,
    isDeleted: false,
    // FREE_DELIVERY offers are disabled — never listed as available, even if one already exists in the DB
    offerType: { $ne: 'FREE_DELIVERY' },
    validFrom: { $lte: now },
    expiresAt: { $gte: now },
    $or: [{ vendorId: vendorId }, { vendorId: null }, { isGlobal: true }],
  };

  const allOffers = await Offer.find(baseQuery).lean();

  // Load all non-cancelled user orders to calculate previous promo usage
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

  const availableOffers = await Promise.all(
    allOffers.map(async (offer) => {
      const minOrderAmount = offer.minOrderAmount || 0;
      const usageCount = usageMap[offer._id.toString()] || 0;

      const hasApplicableProducts =
        offer.applicableProducts && offer.applicableProducts.length > 0;

      let isProductMatched = hasApplicableProducts
        ? items.some((item: any) => {
            const cartProductId = item.productId
              ? item.productId.toString()
              : '';

            return offer?.applicableProducts?.some(
              (pId: any) => pId.toString() === cartProductId,
            );
          })
        : true;

      // BOGO: eligible only once a full (buyQty + getQty) tier is in the cart
      let bogoMissingQty = 0;
      if (offer.offerType === 'BOGO' && offer.bogo) {
        const triggerProductIds = await resolveBogoTriggerProductIds(
          offer.bogo,
        );
        const triggerQty = getBogoTriggerQty(
          items,
          triggerProductIds,
          offer.bogo.buyVariationSku,
        );
        const eligibleFreeQty = getBogoEligibleFreeQty(offer.bogo, triggerQty);
        isProductMatched = eligibleFreeQty > 0;
        bogoMissingQty = Math.max(
          0,
          offer.bogo.buyQty + offer.bogo.getQty - triggerQty,
        );
      }

      const isMinAmountMet = cartTotal >= minOrderAmount;
      const isUsageLimitMet = usageCount < (offer.userUsageLimit || Infinity);

      const isEligible = isMinAmountMet && isUsageLimitMet && isProductMatched;

      let messageKey: TMessageKey = 'OFFER_IS_APPLICABLE';
      let variables: Record<string, string | number | boolean> | undefined;

      if (!isProductMatched) {
        if (offer.offerType === 'BOGO' && offer.bogo) {
          const productName = await getBogoTriggerLabel(offer.bogo, lang);
          messageKey = 'BOGO_ADD_MORE_QTY_TO_UNLOCK';
          variables = { qty: bogoMissingQty, productName };
        } else {
          messageKey = 'OFFER_NOT_VALID_FOR_CART_PRODUCTS';
        }
      } else if (!isMinAmountMet) {
        const diff = Math.max(0, roundTo2(minOrderAmount - cartTotal));
        messageKey = 'ADD_MORE_TO_UNLOCK_OFFER';
        variables = { amount: diff };
      } else if (!isUsageLimitMet) {
        messageKey = 'OFFER_USAGE_LIMIT_EXCEEDED';
      }

      return {
        ...offer,
        isEligible,
        messageKey,
        variables,
      };
    }),
  );

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Available Offers', isPlural: true },
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
  const offers = new QueryBuilder(
    Offer.find()
      .populate('vendorId', 'name userId')
      .populate('adminId', 'name userId'),
    query,
  )
    .search(['title.en', 'title.pt', 'code'])
    .filter()
    .sort()
    .paginate()
    .fields();
  const meta = await offers.countTotal();
  const data = await offers.modelQuery;
  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Offers', isPlural: true },
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

  const offer = await Offer.findOne(query)
    .populate('vendorId', 'name userId')
    .populate('adminId', 'name userId');
  if (!offer) {
    throw new AppError(httpStatus.NOT_FOUND, 'OFFER_NOT_FOUND_OR_UNAVAILABLE');
  }

  if (
    isVendor &&
    offer.vendorId?._id.toString() !== currentUser._id.toString() &&
    !offer.isGlobal
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_UNAUTHORIZED_ACTION', {
      action: 'view this offer',
    });
  }

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Offer' },
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
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Offer',
    });
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
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_UNAUTHORIZED_ACTION', {
      action: 'delete this offer',
    });
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
    messageKey: 'COMMON_SOFT_DELETED_SUCCESS',
    variables: { entity: 'Offer' },
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
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED', {
      reason: 'Only administrators can permanently delete an offer.',
    });
  }

  // --------------------------------------------------
  // Find offer
  // --------------------------------------------------
  const offer = await Offer.findById(id);
  if (!offer) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Offer',
    });
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
    messageKey: 'COMMON_PERMANENTLY_DELETED_SUCCESS',
    variables: { entity: 'Offer' },
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
