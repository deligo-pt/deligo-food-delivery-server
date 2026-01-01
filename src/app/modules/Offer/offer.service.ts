import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AuthUser } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { TOffer } from './offer.interface';
import { Offer } from './offer.model';
import { TCheckoutItem } from '../Checkout/checkout.interface';

type TApplyOfferPayload = {
  vendorId: string;
  subtotal: number;
  offerCode?: string;
};

// create offer service
const createOffer = async (payload: TOffer, currentUser: AuthUser) => {
  // --------------------------------------------
  //  Get logged-in user
  // --------------------------------------------
  const { user: loggedInUser } = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (!loggedInUser) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'User not found');
  }

  // --------------------------------------------
  //  Role-based access control
  // --------------------------------------------
  if (currentUser.role === 'VENDOR') {
    // Vendor can ONLY create vendor-specific offers
    payload.vendorId = loggedInUser._id;
  } else {
    // Admin / Super Admin
    payload.vendorId = payload.vendorId ?? null; // null = global offer
  }

  // --------------------------------------------
  //  Offer type validation
  // --------------------------------------------
  switch (payload.offerType) {
    case 'PERCENT':
      if (!payload.discountValue) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'discountValue is required for PERCENT offer'
        );
      }
      break;

    case 'FLAT':
      if (!payload.discountValue) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'discountValue is required for FLAT offer'
        );
      }
      break;

    case 'BOGO':
      if (!payload.bogo?.buyQty || !payload.bogo?.getQty) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'BOGO offer requires buyQty and getQty'
        );
      }
      break;

    case 'FREE_DELIVERY':
      break;

    default:
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid offer type');
  }

  // --------------------------------------------
  //  Code vs Auto apply validation
  // --------------------------------------------
  if (!payload.isAutoApply && !payload.code) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Offer code is required when auto apply is disabled'
    );
  }

  if (payload.isAutoApply) {
    payload.code = undefined;
  }

  // --------------------------------------------
  //  Date validation
  // --------------------------------------------
  if (payload.endDate <= payload.startDate) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'End date must be after start date'
    );
  }

  // --------------------------------------------
  //  Create Offer
  // --------------------------------------------
  const offer = await Offer.create({
    ...payload,
    usageCount: 0,
    isActive: true,
    isDeleted: false,
  });

  return offer;
};

// update offer service
const updateOffer = async (
  id: string,
  payload: Partial<TOffer>,
  currentUser: AuthUser
) => {
  // --------------------------------------------------
  // Validate logged-in user
  // --------------------------------------------------
  const { user: loggedInUser } = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${loggedInUser.status}`
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
  // Authorization (Vendor can update only own offer)
  // --------------------------------------------------
  if (
    ['VENDOR', 'SUB_VENDOR'].includes(loggedInUser.role) &&
    offer.vendorId?.toString() !== loggedInUser._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this offer'
    );
  }

  // --------------------------------------------------
  // Prevent update if offer already expired
  // --------------------------------------------------
  if (offer.endDate < new Date()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Expired offer cannot be updated'
    );
  }

  // --------------------------------------------------
  // Date validation
  // --------------------------------------------------
  if (payload.startDate && payload.endDate) {
    if (new Date(payload.startDate) >= new Date(payload.endDate)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Start date must be before end date'
      );
    }
  }

  // --------------------------------------------------
  // OfferType based validation
  // --------------------------------------------------
  const offerType = payload.offerType ?? offer.offerType;

  if (offerType === 'PERCENT') {
    if (payload.discountValue !== undefined) {
      if (payload.discountValue <= 0 || payload.discountValue > 100) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Percent discount must be between 1 and 100'
        );
      }
    }
  }

  if (offerType === 'FLAT') {
    if (payload.discountValue !== undefined && payload.discountValue <= 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Flat discount must be greater than 0'
      );
    }
  }

  if (offerType === 'FREE_DELIVERY') {
    payload.discountValue = undefined;
    payload.maxDiscountAmount = undefined;
  }

  if (offerType === 'BOGO') {
    if (!payload.bogo && !offer.bogo) {
      throw new AppError(httpStatus.BAD_REQUEST, 'BOGO details are required');
    }
  }

  // --------------------------------------------------
  // Auto apply & code validation
  // --------------------------------------------------
  if (payload.isAutoApply === false) {
    if (!payload.code && !offer.code) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Offer code is required when auto apply is disabled'
      );
    }
  }

  if (payload.isAutoApply === true) {
    payload.code = undefined;
  }

  // --------------------------------------------------
  // Usage limits sanity check
  // --------------------------------------------------
  if (
    payload.maxUsageCount !== undefined &&
    offer.usageCount !== undefined &&
    payload.maxUsageCount < offer.usageCount
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Max usage count cannot be less than already used count'
    );
  }

  // --------------------------------------------------
  // Update offer
  // --------------------------------------------------
  const updatedOffer = await Offer.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return updatedOffer;
};

// get applicable offer for checkout
const getApplicableOffer = async (
  { vendorId, subtotal, offerCode }: TApplyOfferPayload,
  currentUser: AuthUser
) => {
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
      code: offerCode,
      isAutoApply: false,
    }).sort({ vendorId: -1 });

    if (!offer) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Invalid or expired offer code1'
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
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Minimum order amount ${offer.minOrderAmount} required`
    );
  }

  // --------------------------------------------
  // Usage limit validation
  // --------------------------------------------
  const usageCount = offer.usageCount ?? 0;

  if (offer.maxUsageCount !== undefined && usageCount >= offer.maxUsageCount) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Offer usage limit reached');
  }

  return offer;
};

// apply offer to checkout
const applyOffer = ({
  offer,
  items,
  subtotal,
  deliveryCharge,
}: {
  offer: TOffer | null;
  items: TCheckoutItem[];
  subtotal: number;
  deliveryCharge: number;
}) => {
  if (!offer) {
    return {
      discount: 0,
      deliveryCharge,
      subTotal: subtotal + deliveryCharge,
      appliedOffer: null,
    };
  }

  let discount = 0;
  let finalDeliveryCharge = deliveryCharge;

  switch (offer.offerType) {
    case 'PERCENT': {
      const percent = (subtotal * offer.discountValue!) / 100;
      discount = offer.maxDiscountAmount
        ? Math.min(percent, offer.maxDiscountAmount)
        : percent;
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
      const item = items.find((i) => i.productId.toString() === bogo.itemId);

      if (item) {
        const group = bogo.buyQty + bogo.getQty;
        const freeQty = Math.floor(item.quantity / group) * bogo.getQty;

        discount = freeQty * item.price;
      }
      break;
    }
  }

  discount = Math.max(0, Math.min(discount, subtotal));

  return {
    discount,
    deliveryCharge: finalDeliveryCharge,
    subTotal: subtotal - discount + finalDeliveryCharge,

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
  query: Record<string, unknown>
) => {
  const { user: loggedInUser } = await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });

  if (loggedInUser.role === 'VENDOR') {
    query.vendorId = loggedInUser._id;
  }
  const offers = new QueryBuilder(Offer.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search([]);
  const meta = await offers.countTotal();
  const data = await offers.modelQuery;
  return {
    meta,
    data,
  };
};

// get single offer service
const getSingleOffer = async (id: string, currentUser: AuthUser) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const offer = await Offer.findById(id);
  if (!offer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Offer not found');
  }
  return offer;
};

// soft delete offer service
const softDeleteOffer = async (id: string, currentUser: AuthUser) => {
  // --------------------------------------------------
  // Validate logged-in user
  // --------------------------------------------------
  const { user: loggedInUser } = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${loggedInUser.status}`
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
  // Authorization
  // --------------------------------------------------
  if (
    ['VENDOR', 'SUB_VENDOR'].includes(loggedInUser.role) &&
    offer.vendorId?.toString() !== loggedInUser._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to delete this offer'
    );
  }

  // --------------------------------------------------
  // Prevent duplicate delete
  // --------------------------------------------------
  if (offer.isDeleted) {
    throw new AppError(httpStatus.CONFLICT, 'Offer is already deleted');
  }

  // --------------------------------------------------
  // Prevent deleting active offer
  // --------------------------------------------------
  if (offer.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Active offer must be deactivated before deleting'
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
  // --------------------------------------------------
  // Validate logged-in user
  // --------------------------------------------------
  const { user: loggedInUser } = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${loggedInUser.status}`
    );
  }

  // --------------------------------------------------
  // Only Admin / Super Admin allowed
  // --------------------------------------------------
  if (!['ADMIN', 'SUPER_ADMIN'].includes(loggedInUser.role)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only admin can permanently delete an offer'
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
      'Offer must be soft deleted before permanent delete'
    );
  }

  if (offer.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Active offer cannot be permanently deleted'
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
  getApplicableOffer,
  getAllOffers,
  getSingleOffer,
  softDeleteOffer,
  permanentDeleteOffer,
};
