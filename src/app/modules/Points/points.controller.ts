import { AuthUser } from '../../constant/user.constant';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { PointsServices } from './points.service';

// add order points controller
const addOrderPoints = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const { _id: userObjectId } = currentUser;

  const result = await PointsServices.addOrderPoints(
    userObjectId,
    req.body.orderId,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.pointsEarned,
  });
});

// add delivery partner points controller
const addDeliveryPartnerPoints = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const result = await PointsServices.addDeliveryPartnerPoints(
    currentUser._id.toString(),
    req.body.orderId,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.pointsEarned,
  });
});

// get my points controller
const getMyPoints = catchAsync(async (req, res) => {
  const result = await PointsServices.getMyPoints(req.user as AuthUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

const getAllPoints = catchAsync(async (req, res) => {
  const result = await PointsServices.getAllPoints(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    meta: result?.meta,
    data: result?.data,
  });
});

export const PointsController = {
  addOrderPoints,
  addDeliveryPartnerPoints,
  getMyPoints,
  getAllPoints,
};
