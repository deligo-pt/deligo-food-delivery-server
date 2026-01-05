import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { RatingServices } from './rating.service';

// create rating controller
const createRating = catchAsync(async (req, res) => {
  const result = await RatingServices.createRatingIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Rating created successfully',
    data: result,
  });
});

// get all ratings
const getAllRatings = catchAsync(async (req, res) => {
  const result = await RatingServices.getAllRatingsFromDB(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Ratings fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const RatingControllers = {
  createRating,
  getAllRatings,
};
