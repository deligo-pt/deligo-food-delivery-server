/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AuthUser } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { TOffer } from './offer.interface';
import { Offer } from './offer.model';
import { Product } from '../Product/product.model';
import { CheckoutSummary } from '../Checkout/checkout.model';
import mongoose from 'mongoose';

// create offer service
const createOffer = async (payload: TOffer, currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not authorized. Your account is ${currentUser.status}`,
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
  if (payload.offerType === 'BOGO' && payload.bogo?.productId) {
    const product = await Product.findById(payload.bogo.productId);

    if (!product) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'The specified product for BOGO was not found',
      );
    }

    // If currentUser is a Vendor, ensure they own the product
    if (
      isVendor &&
      product.vendorId.toString() !== currentUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You can only create BOGO offers for your own products',
      );
    }
  }

  if (!payload.isAutoApply && payload.code) {
    const existingCode = await Offer.findOne({
      code: payload.code.toUpperCase(),
      isDeleted: false,
    });
    if (existingCode) {
      throw new AppError(
        httpStatus.CONFLICT,
        'An active offer with this code already exists',
      );
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
          `Valid discountValue is required for ${payload.offerType} offer`,
        );
      }
      break;

    case 'BOGO':
      if (
        !payload.bogo?.buyQty ||
        !payload.bogo?.getQty ||
        !payload.bogo?.productId
      ) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'BOGO offer requires buyQty, getQty and a valid productId',
        );
      }
      break;

    case 'FREE_DELIVERY':
      break;

    default:
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid offer type');
  }

  // --------------------------------------------
  //  Date validation
  // --------------------------------------------
  const validFrom = new Date(payload.validFrom);
  const expiresAt = new Date(payload.expiresAt);
  if (expiresAt <= validFrom) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'End date must be after start date',
    );
  }

  if (expiresAt <= new Date()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'End date cannot be in the past',
    );
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

  return offer;
};

// update offer service
const updateOffer = async (
  id: string,
  payload: Partial<TOffer>,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`,
    );
  }

  // --------------------------------------------------
  // Find offer
  // --------------------------------------------------
  const offer = await Offer.findById(id);
  if (!offer || offer.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Offer not found');
  }

  // --------------------------------------------------
  // Authorization (Vendor can update only own offer)
  // --------------------------------------------------
  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);
  if (isVendor && offer.vendorId?.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this offer',
    );
  }

  // --------------------------------------------------
  // Prevent update if offer already expired
  // --------------------------------------------------
  if (offer.expiresAt < new Date()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Expired offer cannot be updated',
    );
  }

  // --------------------------------------------------
  // OfferType based validation
  // --------------------------------------------------
  const offerType = payload.offerType ?? offer.offerType;

  if (offerType === 'BOGO') {
    const productId = payload.bogo?.productId || offer.bogo?.productId;
    if (productId && payload.bogo?.productId) {
      const product = await Product.findById(productId);
      if (
        !product ||
        (isVendor && product.vendorId.toString() !== currentUser._id.toString())
      ) {
        throw new AppError(httpStatus.FORBIDDEN, 'Invalid product for BOGO');
      }
    }
  }

  const currentAutoApply = payload.isAutoApply ?? offer.isAutoApply;
  if (currentAutoApply) {
    payload.code = undefined;
  } else {
    if (payload.code) {
      payload.code = payload.code.toUpperCase();
      const duplicate = await Offer.findOne({
        code: payload.code,
        isDeleted: false,
        _id: { $ne: id },
      });
      if (duplicate)
        throw new AppError(httpStatus.CONFLICT, 'Code already in use');
    } else if (!offer.code) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Code is required for manual offers',
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
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'End date must be after start date',
    );
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
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Percentage must be between 1-100',
      );
    }
  }

  if (offerType === 'FLAT' && payload.discountValue !== undefined) {
    if (payload.discountValue <= 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Flat discount must be positive',
      );
    }
  }

  if (offerType === 'FREE_DELIVERY') {
    payload.discountValue = 0;
    payload.maxDiscountAmount = 0;
    (payload as any).bogo = null;
  }

  if (payload.bogo && offer.bogo) {
    payload.bogo = { ...offer.bogo, ...payload.bogo };
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
      'Max usage cannot be less than current usage',
    );
  }

  // --------------------------------------------------
  // Update offer
  // --------------------------------------------------
  const updatedOffer = await Offer.findByIdAndUpdate(
    id,
    { $set: payload },
    {
      new: true,
      runValidators: true,
    },
  );

  return updatedOffer;
};

// toggle offer status service
const toggleOfferStatus = async (id: string, currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${currentUser.status}. You cannot perform this action.`,
    );
  }

  const offer = await Offer.findById(id);
  if (!offer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Offer not found');
  }

  if (offer.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot toggle a deleted offer');
  }

  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);

  if (isVendor && offer.vendorId?.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to change the status of this offer',
    );
  }

  if (!offer.isActive && offer.expiresAt < new Date()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot activate an expired offer. Please update the end date first.',
    );
  }

  offer.isActive = !offer.isActive;
  const updatedOffer = await offer.save();
  return {
    message: `Offer ${
      updatedOffer?.isActive ? 'activated' : 'deactivated'
    } successfully`,
    data: updatedOffer,
  };
};

// validate and apply offer service
const validateAndApplyOffer = async (
  checkoutId: string,
  offerIdentifier: string,
  currentUser: AuthUser,
) => {
  const checkoutData = await CheckoutSummary.findById(checkoutId);
  if (!checkoutData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Checkout session not found');
  }

  if (checkoutData.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This checkout session doesn't belong to you",
    );
  }

  if (checkoutData.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot apply offer to completed checkout',
    );
  }

  const {
    vendorId,
    totalPrice,
    deliveryCharge,
    items,
    taxAmount,
    deliveryVatAmount,
  } = checkoutData;
  const now = new Date();

  const baseQuery = {
    isActive: true,
    isDeleted: false,
    validFrom: { $lte: now },
    expiresAt: { $gte: now },
    $or: [{ vendorId: vendorId }, { vendorId: null }],
  };

  let offer = null;
  if (offerIdentifier && offerIdentifier.trim() !== '') {
    const isObjectId = mongoose.Types.ObjectId.isValid(offerIdentifier);

    if (isObjectId) {
      offer = await Offer.findOne({ ...baseQuery, _id: offerIdentifier });
    } else {
      offer = await Offer.findOne({
        ...baseQuery,
        code: offerIdentifier.toUpperCase(),
      });
    }

    if (!offer)
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid offer or promo code');
  }

  if (offer) {
    if (offer.maxUsageCount && (offer.usageCount || 0) >= offer.maxUsageCount) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Offer limit reached');
    }

    if (offer.minOrderAmount && totalPrice < offer.minOrderAmount) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Min order €${offer.minOrderAmount} required`,
      );
    }
  }

  if (!offer) {
    const resetSubtotal = Number(
      (
        totalPrice +
        taxAmount +
        deliveryCharge +
        (deliveryVatAmount || 0)
      ).toFixed(2),
    );
    return await CheckoutSummary.findByIdAndUpdate(
      checkoutId,
      {
        $set: {
          offerDiscount: 0,
          offerId: null,
          promoType: 'NONE',
          offerApplied: null,
          subtotal: resetSubtotal,
        },
      },
      { new: true },
    ).lean();
  }

  let discount = 0;
  let finalDeliveryCharge = deliveryCharge;
  let bogoSnapshot = null;

  switch (offer.offerType) {
    case 'PERCENT': {
      const calculated = (totalPrice * (offer.discountValue || 0)) / 100;
      discount = offer.maxDiscountAmount
        ? Math.min(calculated, offer.maxDiscountAmount)
        : calculated;
      break;
    }
    case 'FLAT': {
      discount = offer.discountValue || 0;
      break;
    }
    case 'FREE_DELIVERY': {
      finalDeliveryCharge = 0;
      break;
    }
    case 'BOGO': {
      const bogo = offer.bogo!;
      const targetItem = items.find(
        (i: any) => i.productId?.toString() === bogo.productId.toString(),
      );
      if (targetItem) {
        const freeQty =
          Math.floor(targetItem.quantity / (bogo.buyQty + bogo.getQty)) *
          bogo.getQty;
        discount = freeQty * targetItem.price;
        bogoSnapshot = {
          buyQty: bogo.buyQty,
          getQty: bogo.getQty,
          productId: bogo.productId,
          productName: targetItem.name,
        };
      }
      break;
    }
  }

  discount = Number(Math.min(discount, totalPrice).toFixed(2));

  const newSubtotal = Number(
    (
      totalPrice -
      discount +
      taxAmount +
      finalDeliveryCharge +
      (deliveryVatAmount || 0)
    ).toFixed(2),
  );

  const offerUpdateData = {
    offerDiscount: discount,
    deliveryCharge: finalDeliveryCharge,
    subtotal: newSubtotal,
    offerId: offer._id,
    promoType: 'OFFER',
    offerApplied: {
      promoId: offer._id,
      title: offer.title,
      promoType: 'OFFER',
      offerType: offer.offerType,
      discountValue: offer.discountValue,
      maxDiscountAmount: offer.maxDiscountAmount,
      code: offer.code,
      bogoSnapshot: bogoSnapshot,
    },
  };

  const result = await CheckoutSummary.findByIdAndUpdate(
    checkoutId,
    { $set: offerUpdateData },
    { new: true, runValidators: true },
  ).lean();

  return result;
};

// get all offers service
const getAllOffers = async (
  currentUser: AuthUser,
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
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(['title', 'code']);
  const meta = await offers.countTotal();
  const data = await offers.modelQuery;
  return {
    meta,
    data,
  };
};

// get single offer service
const getSingleOffer = async (id: string, currentUser: AuthUser) => {
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
    throw new AppError(httpStatus.NOT_FOUND, 'Offer not found or unavailable');
  }

  if (
    isVendor &&
    offer.vendorId?.toString() !== currentUser._id.toString() &&
    !offer.isGlobal
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to view this offer',
    );
  }

  return offer;
};

// soft delete offer service
const softDeleteOffer = async (id: string, currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`,
    );
  }

  // --------------------------------------------------
  // Find offer
  // --------------------------------------------------
  const offer = await Offer.findById(id);
  if (!offer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Offer not found');
  }

  // --------------------------------------------------
  // Prevent duplicate delete
  // --------------------------------------------------
  if (offer.isDeleted) {
    throw new AppError(httpStatus.CONFLICT, 'Offer is already deleted');
  }

  // --------------------------------------------------
  // Authorization
  // --------------------------------------------------
  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);
  if (isVendor && offer.vendorId?.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to delete this offer',
    );
  }

  // --------------------------------------------------
  // Prevent deleting active offer
  // --------------------------------------------------
  if (offer.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Active offer must be deactivated before deleting',
    );
  }

  // --------------------------------------------------
  // Soft delete
  // --------------------------------------------------
  offer.isDeleted = true;
  offer.isActive = false;
  await offer.save();

  return {
    message: 'Offer deleted successfully',
  };
};

// permanent delete offer service
const permanentDeleteOffer = async (id: string, currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`,
    );
  }

  // --------------------------------------------------
  // Only Admin / Super Admin allowed
  // --------------------------------------------------
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  if (!isAdmin) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only admin can permanently delete an offer',
    );
  }

  // --------------------------------------------------
  // Find offer
  // --------------------------------------------------
  const offer = await Offer.findById(id);
  if (!offer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Offer not found');
  }

  // --------------------------------------------------
  // Safety checks
  // --------------------------------------------------
  if (!offer.isDeleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Offer must be soft deleted before permanent delete',
    );
  }

  if (offer.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Active offer cannot be permanently deleted',
    );
  }

  // --------------------------------------------------
  // Permanent delete
  // --------------------------------------------------
  await Offer.findByIdAndDelete(id);

  return {
    message: 'Offer permanently deleted successfully',
  };
};
export const OfferServices = {
  createOffer,
  updateOffer,
  toggleOfferStatus,
  validateAndApplyOffer,
  getAllOffers,
  getSingleOffer,
  softDeleteOffer,
  permanentDeleteOffer,
};
