import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { OfferServices } from './offer.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

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
  const result = await OfferServices.getAvailableOffersForCheckout(
    checkoutId as string,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// get all offers controller
const getAllOffers = catchAsync(async (req, res) => {
  const result = await OfferServices.getAllOffers(
    req.user as TCurrentUser,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single offer controller
const getSingleOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const result = await OfferServices.getSingleOffer(
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
