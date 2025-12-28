import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { OfferServices } from './offer.service';
import { AuthUser } from '../../constant/user.constant';

// create offer controller
const createOffer = catchAsync(async (req, res) => {
  const result = await OfferServices.createOffer(
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Offer created successfully',
    data: result,
  });
});

// get all offers controller
const getAllOffers = catchAsync(async (req, res) => {
  const result = await OfferServices.getAllOffers(
    req.user as AuthUser,
    req.query
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Offers fetched successfully',
    data: result,
  });
});

export const OfferControllers = {
  createOffer,
  getAllOffers,
};
