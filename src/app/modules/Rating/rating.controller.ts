import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { RatingServices } from './rating.service';
import { AuthUser } from '../../constant/user.constant';

// create rating controller
const createRating = catchAsync(async (req, res) => {
  const result = await RatingServices.createRating(
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Rating created successfully',
    data: result,
  });
});

// get all ratings
const getAllRatings = catchAsync(async (req, res) => {
  const result = await RatingServices.getAllRatings(
    req.query,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Ratings fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getRatingSummary = catchAsync(async (req, res) => {
  const result = await RatingServices.getRatingSummary(req.user as AuthUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Ratings fetched successfully',
    data: result,
  });
});

export const RatingControllers = {
  createRating,
  getAllRatings,
  getRatingSummary,
};
