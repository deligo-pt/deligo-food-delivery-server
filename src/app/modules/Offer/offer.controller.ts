import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { OfferServices } from './offer.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { formatOfferResponse } from './offer.utils';

// create offer controller
const createOffer = catchAsync(async (req, res) => {
  const result = await OfferServices.createOffer(
    req.body,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: result?.message,
    data: result?.data,
  });
});

// update offer controller
const updateOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const result = await OfferServices.updateOffer(
    offerId,
    req.body,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// toggle offer status controller
const toggleOfferStatus = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const result = await OfferServices.toggleOfferStatus(
    offerId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
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
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// get available offers for checkout controller
const getAvailableOffersForCheckout = catchAsync(async (req, res) => {
  const { checkoutId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await OfferServices.getAvailableOffersForCheckout(
    checkoutId as string,
    currentUser,
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
    message: result?.message,
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
    message: result?.message,
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
    message: result?.message,
    data: formattedData,
  });
});

// soft delete offer controller
const softDeleteOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const result = await OfferServices.softDeleteOffer(
    offerId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// permanently delete offer controller
const permanentDeleteOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const result = await OfferServices.permanentDeleteOffer(
    offerId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
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
