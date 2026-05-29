import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DeliveryPartnerServices } from './delivery-partner.service';
import { TAuthUser } from '../AuthUser/authUser.interface';

// Delivery Partner Update Controller
const updateDeliveryPartner = catchAsync(async (req, res) => {
  const currentUser = req.user as TAuthUser;
  const result = await DeliveryPartnerServices.updateDeliveryPartner(
    req.body,
    req.params.deliveryPartnerCustomId,
    currentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery Partner updated successfully',
    data: result,
  });
});

// delivery partner live location update
const updateDeliveryPartnerLiveLocation = catchAsync(async (req, res) => {
  const result =
    await DeliveryPartnerServices.updateDeliveryPartnerLiveLocation(
      req.body,
      req.user as TAuthUser,
      req.params.deliveryPartnerCustomId,
    );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// change delivery partner status
// delivery partner doc image upload
const deliveryPartnerDocImageUpload = catchAsync(async (req, res) => {
  const file = req.file;
  const result = await DeliveryPartnerServices.deliverPartnerDocImageUpload(
    file?.path,
    req.body,
    req.user as TAuthUser,
    req.params.deliveryPartnerCustomId,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery Partner document image updated successfully',
    data: result,
  });
});

const changeDeliveryPartnerStatus = catchAsync(async (req, res) => {
  const result = await DeliveryPartnerServices.changeDeliveryPartnerStatus(
    req.user as TAuthUser,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// get all delivery partners
const getAllDeliveryPartners = catchAsync(async (req, res) => {
  const result = await DeliveryPartnerServices.getAllDeliveryPartnersFromDB(
    req.query,
    req.user as TAuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery Partners Retrieved Successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// get single delivery partner
const getSingleDeliveryPartner = catchAsync(async (req, res) => {
  const result = await DeliveryPartnerServices.getSingleDeliveryPartnerFromDB(
    req.params.deliveryPartnerCustomId,
    req.user as TAuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery Partner Retrieved Successfully',
    data: result,
  });
});

export const DeliveryPartnerControllers = {
  updateDeliveryPartner,
  updateDeliveryPartnerLiveLocation,
  deliveryPartnerDocImageUpload,
  changeDeliveryPartnerStatus,
  getAllDeliveryPartners,
  getSingleDeliveryPartner,
};
