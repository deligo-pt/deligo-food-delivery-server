import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { OfferServices } from './offer.service';
import { AuthUser } from '../../constant/user.constant';

// create offer controller
const createOffer = catchAsync(async (req, res) => {
  const result = await OfferServices.createOffer(
    req.body,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Offer created successfully',
    data: result,
  });
});

// update offer controller
const updateOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const result = await OfferServices.updateOffer(
    offerId,
    req.body,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Offer updated successfully',
    data: result,
  });
});

// toggle offer status controller
const toggleOfferStatus = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const result = await OfferServices.toggleOfferStatus(
    offerId,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Offer status updated successfully',
    data: result,
  });
});

// get applicable offer controller
const getApplicableOffer = catchAsync(async (req, res) => {
  const { vendorId, subtotal, offerCode } = req.body;

  const result = await OfferServices.getApplicableOffer(
    {
      vendorId,
      subtotal,
      offerCode,
    },
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result
      ? 'Applicable offer fetched successfully'
      : 'No applicable offer found',
    data: result,
  });
});

// get all offers controller
const getAllOffers = catchAsync(async (req, res) => {
  const result = await OfferServices.getAllOffers(
    req.user as AuthUser,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Offers fetched successfully',
    data: result,
  });
});

// get single offer controller
const getSingleOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const result = await OfferServices.getSingleOffer(
    offerId,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Offer fetched successfully',
    data: result,
  });
});

// soft delete offer controller
const softDeleteOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;
  const result = await OfferServices.softDeleteOffer(
    offerId,
    req.user as AuthUser,
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
    req.user as AuthUser,
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
  getApplicableOffer,
  getAllOffers,
  getSingleOffer,
  softDeleteOffer,
  permanentDeleteOffer,
};
