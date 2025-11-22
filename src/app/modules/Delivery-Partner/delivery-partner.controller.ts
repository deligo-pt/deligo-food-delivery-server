import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DeliveryPartnerServices } from './delivery-partner.service';
import { AuthUser } from '../../constant/user.const';

// Delivery Partner Update Controller
const updateDeliveryPartner = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const profilePhoto = req.file?.path as string;
  const result = await DeliveryPartnerServices.updateDeliveryPartner(
    req.body,
    req.params.deliveryPartnerId,
    currentUser,
    profilePhoto
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery Partner updated successfully',
    data: result,
  });
});

// delivery partner doc image upload
const deliveryPartnerDocImageUpload = catchAsync(async (req, res) => {
  const file = req.file;
  const result = await DeliveryPartnerServices.deliverPartnerDocImageUpload(
    file?.path,
    req.body,
    req.user as AuthUser,
    req.params.deliveryPartnerId
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.existingDeliveryPartner,
  });
});

// get all delivery partners
const getAllDeliveryPartners = catchAsync(async (req, res) => {
  const result = await DeliveryPartnerServices.getAllDeliveryPartnersFromDB(
    req.query,
    req.user as AuthUser
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
    req.params.deliveryPartnerId,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery Partner Retrieved Successfully',
    data: result,
  });
});

// soft delete delivery partner
const softDeleteDeliveryPartner = catchAsync(async (req, res) => {
  const result = await DeliveryPartnerServices.softDeleteDeliveryPartner(
    req.params.deliveryPartnerId,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// permanent delete delivery partner
const permanentDeleteDeliveryPartner = catchAsync(async (req, res) => {
  const result = await DeliveryPartnerServices.permanentDeleteDeliveryPartner(
    req.params.deliveryPartnerId,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

export const DeliveryPartnerControllers = {
  updateDeliveryPartner,
  deliveryPartnerDocImageUpload,
  getAllDeliveryPartners,
  getSingleDeliveryPartner,
  softDeleteDeliveryPartner,
  permanentDeleteDeliveryPartner,
};
