import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DeliveryPartnerServices } from './delivery-partner.service';
import { AuthUser } from '../../constant/user.const';

// Delivery Partner Update Controller
const updateDeliveryPartner = catchAsync(async (req, res) => {
  const user = req.user as AuthUser;
  const result = await DeliveryPartnerServices.updateDeliveryPartner(
    req.body,
    req.params.deliveryPartnerId,
    user
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
  const deliveryPartners =
    await DeliveryPartnerServices.getAllDeliveryPartnersFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery Partners Retrieved Successfully',
    data: deliveryPartners,
  });
});

// get single delivery partner
const getSingleDeliveryPartner = catchAsync(async (req, res) => {
  const deliveryPartner =
    await DeliveryPartnerServices.getSingleDeliveryPartnerFromDB(
      req.params.deliveryPartnerId
    );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery Partner Retrieved Successfully',
    data: deliveryPartner,
  });
});

export const DeliveryPartnerControllers = {
  updateDeliveryPartner,
  getAllDeliveryPartners,
  getSingleDeliveryPartner,
};
