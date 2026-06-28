import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { CustomerServices } from './customer.service';

// Customer Update Controller
const updateCustomer = catchAsync(async (req, res) => {
  const result = await CustomerServices.updateCustomer(
    req.body,
    req.params.customerId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// update live location controller
const updateCustomerLiveLocation = catchAsync(async (req, res) => {
  const result = await CustomerServices.updateCustomerLiveLocation(
    req.body,
    req.user as TCurrentUser,
    req.params.customerId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// add delivery address
const addDeliveryAddress = catchAsync(async (req, res) => {
  const { deliveryAddress } = req.body;
  const result = await CustomerServices.addDeliveryAddress(
    deliveryAddress,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// update delivery address controller
const updateDeliveryAddress = catchAsync(async (req, res) => {
  const { addressId } = req.params;
  const payload = req.body.deliveryAddress;
  const user = req.user as TCurrentUser;

  const result = await CustomerServices.updateDeliveryAddress(
    addressId,
    payload,
    user,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// toggle delivery address status
const toggleDeliveryAddressStatus = catchAsync(async (req, res) => {
  const result = await CustomerServices.toggleDeliveryAddressStatus(
    req.params.addressId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// delete delivery address
const deleteDeliveryAddress = catchAsync(async (req, res) => {
  const result = await CustomerServices.deleteDeliveryAddress(
    req.params.addressId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// get all customers
const getAllCustomers = catchAsync(async (req, res) => {
  const result = await CustomerServices.getAllCustomersFromDB(
    req.query,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single customer
const getSingleCustomer = catchAsync(async (req, res) => {
  const result = await CustomerServices.getSingleCustomerFromDB(
    req.params.customerId,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

export const CustomerControllers = {
  updateCustomer,
  updateCustomerLiveLocation,
  addDeliveryAddress,
  updateDeliveryAddress,
  toggleDeliveryAddressStatus,
  deleteDeliveryAddress,
  getAllCustomers,
  getSingleCustomer,
};
