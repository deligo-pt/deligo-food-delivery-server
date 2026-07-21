import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { PointsServices } from './points.service';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// add order points controller
const addOrderPoints = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const { _id: userId } = currentUser;

  const result = await PointsServices.addOrderPoints(userId, req.body.orderId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Added Order Points',
    target: `Order #${req.body.orderId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.pointsEarned,
  });
});

// add delivery partner points controller
const addDeliveryPartnerPoints = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await PointsServices.addDeliveryPartnerPoints(
    currentUser._id.toString(),
    req.body.orderId,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Added Delivery Partner Points',
    target: `Order #${req.body.orderId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.pointsEarned,
  });
});

// get my points controller
const getMyPoints = catchAsync(async (req, res) => {
  const result = await PointsServices.getMyPoints(req.user as TCurrentUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const getAllPoints = catchAsync(async (req, res) => {
  const result = await PointsServices.getAllPoints(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
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
