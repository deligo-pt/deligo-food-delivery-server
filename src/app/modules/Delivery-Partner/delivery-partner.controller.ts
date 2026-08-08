import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DeliveryPartnerServices } from './delivery-partner.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// Delivery Partner Update Controller
const updateDeliveryPartner = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await DeliveryPartnerServices.updateDeliveryPartner(
    req.body,
    req.params.deliveryPartnerId,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Delivery Partner',
    target: `Delivery Partner #${req.params.deliveryPartnerId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// delivery partner live location update
const updateDeliveryPartnerLiveLocation = catchAsync(async (req, res) => {
  const result =
    await DeliveryPartnerServices.updateDeliveryPartnerLiveLocation(
      req.body,
      req.user as TCurrentUser,
      req.params.deliveryPartnerId,
    );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// change delivery partner status
const changeDeliveryPartnerStatus = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await DeliveryPartnerServices.changeDeliveryPartnerStatus(
    currentUser,
    req.body,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Changed Delivery Partner Status',
    target: `Delivery Partner #${currentUser?.userId}`,
    type: 'WARNING',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// delivery partner doc image upload
const deliveryPartnerDocImageUpload = catchAsync(async (req, res) => {
  const file = req.file;
  const currentUser = req.user as TCurrentUser;
  const result = await DeliveryPartnerServices.deliverPartnerDocImageUpload(
    file?.path,
    req.body,
    currentUser,
    req.params.deliveryPartnerId,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Uploaded Delivery Partner Document',
    target:
      req.body?.docImageTitle ||
      `Delivery Partner #${req.params.deliveryPartnerId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.existingDeliveryPartner,
  });
});

// get all delivery partners
const getAllDeliveryPartners = catchAsync(async (req, res) => {
  const result = await DeliveryPartnerServices.getAllDeliveryPartnersFromDB(
    req.query,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single delivery partner
const getSingleDeliveryPartner = catchAsync(async (req, res) => {
  const result = await DeliveryPartnerServices.getSingleDeliveryPartnerFromDB(
    req.params.deliveryPartnerId,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

const assignDeliveryPartnerToFleetManager = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result =
    await DeliveryPartnerServices.assignDeliveryPartnerToFleetManager(
      req.params.deliveryPartnerId,
      req.body.fleetManagerId,
    );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Assigned Delivery Partner To Fleet Manager',
    target: `Delivery Partner #${req.params.deliveryPartnerId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

export const DeliveryPartnerControllers = {
  updateDeliveryPartner,
  updateDeliveryPartnerLiveLocation,
  deliveryPartnerDocImageUpload,
  changeDeliveryPartnerStatus,
  getAllDeliveryPartners,
  getSingleDeliveryPartner,
  assignDeliveryPartnerToFleetManager,
};
