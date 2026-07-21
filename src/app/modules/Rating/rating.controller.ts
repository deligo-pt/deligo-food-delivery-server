import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { RatingServices } from './rating.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';

// create rating controller
const createRating = catchAsync(async (req, res) => {
  const result = await RatingServices.createRating(
    req.body,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// get all ratings
const getAllRatings = catchAsync(async (req, res) => {
  const result = await RatingServices.getAllRatings(
    req.query,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

const getSingleRating = catchAsync(async (req, res) => {
  const result = await RatingServices.getSingleRating(
    req.params.ratingId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const getRatingSummary = catchAsync(async (req, res) => {
  const result = await RatingServices.getRatingSummary(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

export const RatingControllers = {
  createRating,
  getAllRatings,
  getRatingSummary,
  getSingleRating,
};
