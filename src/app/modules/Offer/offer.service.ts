/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AuthUser } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { TOffer } from './offer.interface';
import { Offer } from './offer.model';
import { TCheckoutItem } from '../Checkout/checkout.interface';
import { Product } from '../Product/product.model';
import { Order } from '../Order/order.model';

type TApplyOfferPayload = {
  vendorId: string;
  subtotal: number;
  offerCode?: string;
};

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
  const productId = payload.bogo?.productId;

  if (offerType === 'BOGO' && productId) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'Specified BOGO product not found',
      );
    }
    if (
      isVendor &&
      product.vendorId.toString() !== currentUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You can only use your own products for BOGO offers',
      );
    }
  }

  if (payload.isAutoApply === true) {
    payload.code = undefined;
  } else if (payload.code) {
    payload.code = payload.code.toUpperCase();
    if (payload.code !== offer.code) {
      const duplicate = await Offer.findOne({
        code: payload.code,
        isDeleted: false,
        _id: { $ne: id },
      });
      if (duplicate)
        throw new AppError(httpStatus.CONFLICT, 'Promo code already in use');
    }
  } else if (payload.isAutoApply === false && !offer.code) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Code required when auto-apply is disabled',
    );
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

  if (payload.offerType) {
    if (payload.offerType === 'BOGO') {
      payload.discountValue = 0;
      payload.maxDiscountAmount = 0;
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

  if (
    offerType === 'FLAT' &&
    payload.discountValue !== undefined &&
    payload.discountValue <= 0
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Flat discount must be positive',
    );
  }
  if (offerType === 'FREE_DELIVERY') {
    payload.discountValue = 0;
    payload.maxDiscountAmount = 0;
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

// get applicable offer for checkout
const getApplicableOffer = async (
  { vendorId, subtotal, offerCode }: TApplyOfferPayload,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${currentUser.status}. You cannot apply offers.`,
    );
  }
  const now = new Date();
  // --------------------------------------------
  // Base query (vendor + global offers)
  // --------------------------------------------
  const baseQuery = {
    isActive: true,
    isDeleted: false,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [{ vendorId }, { vendorId: { $eq: null } }],
  };
  let offer = null;

  // --------------------------------------------
  // Manual offer → code is REQUIRED
  // --------------------------------------------
  if (offerCode) {
    offer = await Offer.findOne({
      ...baseQuery,
      code: offerCode.toUpperCase(),
      isAutoApply: false,
    }).sort({ vendorId: -1 });

    if (!offer) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Invalid or expired offer code',
      );
    }
  }

  // --------------------------------------------
  // Auto-apply offer (only if NO code)
  // --------------------------------------------
  else {
    offer = await Offer.findOne({
      ...baseQuery,
      isAutoApply: true,
    }).sort({ vendorId: -1 });

    // No auto-apply offer → OK, continue checkout
    if (!offer) return null;
  }

  // --------------------------------------------
  // Minimum order amount validation
  // --------------------------------------------
  if (offer.minOrderAmount && subtotal < offer.minOrderAmount) {
    if (!offerCode) return null;

    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Minimum order amount of ${offer.minOrderAmount} is required for this offer`,
    );
  }

  // --------------------------------------------
  // Usage limit validation
  // --------------------------------------------
  const usageCount = offer.usageCount ?? 0;

  if (offer.maxUsageCount !== undefined && usageCount >= offer.maxUsageCount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Offer usage limit has been reached',
    );
  }

  if (offer.userUsageLimit) {
    const userUsageCount = await Order.countDocuments({
      userId: currentUser.userId,
      offerId: offer._id,
      status: { $ne: 'CANCELED' },
    });

    if (userUsageCount >= offer.userUsageLimit) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `You have already used this offer ${offer.userUsageLimit} time(s)`,
      );
    }
  }

  return offer;
};

// apply offer to checkout
const applyOffer = ({
  offer,
  items,
  totalPriceBeforeTax,
  taxAmount,
  deliveryCharge,
}: {
  offer: TOffer | null;
  items: TCheckoutItem[];
  totalPriceBeforeTax: number;
  taxAmount: number;
  deliveryCharge: number;
}) => {
  if (!offer) {
    return {
      discount: 0,
      deliveryCharge,
      subTotal: Number(
        (totalPriceBeforeTax + taxAmount + deliveryCharge).toFixed(2),
      ),
      appliedOffer: null,
    };
  }

  let discount = 0;
  let finalDeliveryCharge = deliveryCharge;

  switch (offer.offerType) {
    case 'PERCENT': {
      const calculatedPercent =
        (totalPriceBeforeTax * (offer.discountValue || 0)) / 100;
      discount = offer.maxDiscountAmount
        ? Math.min(calculatedPercent, offer.maxDiscountAmount)
        : calculatedPercent;
      break;
    }

    case 'FLAT': {
      discount = offer.discountValue!;
      break;
    }

    case 'FREE_DELIVERY': {
      finalDeliveryCharge = 0;
      break;
    }

    case 'BOGO': {
      const bogo = offer.bogo!;
      // Find the item eligible for BOGO
      const item = items.find(
        (i) => i.productId.toString() === bogo.productId.toString(),
      );

      if (item) {
        const groupSize = bogo.buyQty + bogo.getQty;
        const eligibleFreeSets = Math.floor(item.quantity / groupSize);
        const freeQty = eligibleFreeSets * bogo.getQty;

        // Apply discount based on the item's price
        discount = freeQty * item.price;
      }
      break;
    }
  }

  // Discount cannot exceed total item price
  discount = Math.max(0, Math.min(discount, totalPriceBeforeTax));

  // Calculate subtotal
  const subtotal = parseFloat(
    (totalPriceBeforeTax - discount + taxAmount + finalDeliveryCharge).toFixed(
      2,
    ),
  );

  return {
    discount: Number(discount.toFixed(2)),
    deliveryCharge: Number(finalDeliveryCharge.toFixed(2)),
    subtotal,
    appliedOffer: {
      offerId: offer._id,
      title: offer.title,
      offerType: offer.offerType,
      discountValue: offer.discountValue,
      maxDiscountAmount: offer.maxDiscountAmount,
      code: offer.code,
    },
  };
};

// get all offers service
const getAllOffers = async (
  currentUser: AuthUser,
  query: Record<string, unknown>,
) => {
  const now = new Date();

  if (currentUser.role === 'VENDOR') {
    query.vendorId = currentUser._id;
    query.isDeleted = false;
  }
  if (currentUser.role === 'CUSTOMER') {
    query.isActive = true;
    query.isDeleted = false;

    query.startDate = { $lte: now };
    query.endDate = { $gte: now };
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

  if (isVendor && offer.vendorId?.toString() !== currentUser._id.toString()) {
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
  getApplicableOffer,
  applyOffer,
  getAllOffers,
  getSingleOffer,
  softDeleteOffer,
  permanentDeleteOffer,
};
