import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DeliveryPartnerServices } from './delivery-partner.service';
import { AuthUser } from '../../constant/user.constant';

// Delivery Partner Update Controller
const updateDeliveryPartner = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const result = await DeliveryPartnerServices.updateDeliveryPartner(
    req.body,
    req.params.deliveryPartnerId,
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
      req.user as AuthUser,
      req.params.deliveryPartnerId,
    );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// delivery partner doc image upload
const deliveryPartnerDocImageUpload = catchAsync(async (req, res) => {
  const file = req.file;
  const result = await DeliveryPartnerServices.deliverPartnerDocImageUpload(
    file?.path,
    req.body,
    req.user as AuthUser,
    req.params.deliveryPartnerId,
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
    req.user as AuthUser,
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
    req.user as AuthUser,
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
  getAllDeliveryPartners,
  getSingleDeliveryPartner,
};
