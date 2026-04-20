import { AuthUser } from '../../constant/user.constant';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { LoyaltyServices } from './loyalty.service';
import httpStatus from 'http-status';

// add order points controller
const addOrderPoints = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const { _id: userId } = currentUser;

  const result = await LoyaltyServices.addOrderPoints(userId, req.body.orderId);
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
  const result = await LoyaltyServices.addDeliveryPartnerPoints(
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
  const result = await LoyaltyServices.getMyPoints(req.user as AuthUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

const getAllPoints = catchAsync(async (req, res) => {
  const result = await LoyaltyServices.getAllPoints(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    meta: result?.meta,
    data: result?.data,
  });
});

export const LoyaltyController = {
  addOrderPoints,
  addDeliveryPartnerPoints,
  getMyPoints,
  getAllPoints,
};
