import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DeliveryPartnerServices } from './delivery-partner.service';
import { AuthUser } from '../../constant/user.const';

// Delivery Partner Update Controller
const updateDeliveryPartner = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const result = await DeliveryPartnerServices.updateDeliveryPartner(
    req.body,
    req.params.deliveryPartnerId,
    currentUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery Partner updated successfully',
    data: result,
  });
});

// get all delivery partners
const getAllDeliveryPartners = catchAsync(async (req, res) => {
  const result = await DeliveryPartnerServices.getAllDeliveryPartnersFromDB(
    req.query
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

export const DeliveryPartnerControllers = {
  updateDeliveryPartner,
  getAllDeliveryPartners,
  getSingleDeliveryPartner,
};
