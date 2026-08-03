import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { OfferServices } from './offer.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { formatOfferResponse } from './offer.utils';
import { formatCheckoutResponse } from '../Checkout/checkout.utils';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// create offer controller
const createOffer = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await OfferServices.createOffer(req.body, currentUser);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created Offer',
    target: req.body?.title?.en || req.body?.title?.pt || 'New Offer',
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// update offer controller
const updateOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await OfferServices.updateOffer(
    offerId,
    req.body,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Offer',
    target: req.body?.title?.en || req.body?.title?.pt || `Offer #${offerId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// toggle offer status controller
const toggleOfferStatus = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await OfferServices.toggleOfferStatus(offerId, currentUser);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Toggled Offer Status',
    target: `Offer #${offerId}`,
    type: 'WARNING',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// validate and apply offer controller
const validateAndApplyOffer = catchAsync(async (req, res) => {
  const { checkoutId, offerIdentifier } = req.body;
  const result = await OfferServices.validateAndApplyOffer(
    checkoutId,
    offerIdentifier,
    req.user as TCurrentUser,
    req.lang,
  );

  // Flatten items[].name / addons[].name to the requested locale, same as the Checkout controller
  const formattedData = formatCheckoutResponse(result?.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});

// get available offers for checkout controller
const getAvailableOffersForCheckout = catchAsync(async (req, res) => {
  const { checkoutId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await OfferServices.getAvailableOffersForCheckout(
    checkoutId as string,
    currentUser,
    req.lang,
  );

  let formattedData;
  if (currentUser?.role === 'CUSTOMER') {
    formattedData = formatOfferResponse(result.data, req.lang);
  } else {
    formattedData = result.data;
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

// get all offers controller
const getAllOffers = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await OfferServices.getAllOffers(currentUser, req.query);

  let formattedData;

  if (currentUser?.role === 'CUSTOMER') {
    formattedData = formatOfferResponse(result.data, req.lang);
  } else {
    formattedData = result.data;
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: formattedData,
  });
});

// get single offer controller
const getSingleOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await OfferServices.getSingleOffer(offerId, currentUser);

  let formattedData;
  if (currentUser?.role === 'CUSTOMER') {
    formattedData = formatOfferResponse(result.data, req.lang);
  } else {
    formattedData = result.data;
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

// soft delete offer controller
const softDeleteOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await OfferServices.softDeleteOffer(offerId, currentUser);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted Offer',
    target: `Offer #${offerId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: null,
  });
});

// permanently delete offer controller
const permanentDeleteOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await OfferServices.permanentDeleteOffer(
    offerId,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Permanently Deleted Offer',
    target: `Offer #${offerId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: null,
  });
});

export const OfferControllers = {
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
