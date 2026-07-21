import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { CustomerServices } from './customer.service';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// Customer Update Controller
const updateCustomer = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await CustomerServices.updateCustomer(
    req.body,
    req.params.customerId,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Customer',
    target: `Customer #${req.params.customerId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// update live location controller
const updateCustomerLiveLocation = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await CustomerServices.updateCustomerLiveLocation(
    req.body,
    currentUser,
    req.params.customerId,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Customer Live Location',
    target: `Customer #${req.params.customerId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// add delivery address
const addDeliveryAddress = catchAsync(async (req, res) => {
  const { deliveryAddress } = req.body;
  const currentUser = req.user as TCurrentUser;
  const result = await CustomerServices.addDeliveryAddress(
    deliveryAddress,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Added Delivery Address',
    target:
      deliveryAddress?.addressType ||
      deliveryAddress?.street ||
      `Customer #${currentUser?.userId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
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

  createActivityLog({
    customUserId: user?.userId,
    action: 'Updated Delivery Address',
    target:
      payload?.addressType ||
      payload?.street ||
      `Delivery Address #${addressId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// toggle delivery address status
const toggleDeliveryAddressStatus = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await CustomerServices.toggleDeliveryAddressStatus(
    req.params.addressId,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Toggled Delivery Address Status',
    target: `Delivery Address #${req.params.addressId}`,
    type: 'WARNING',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: null,
  });
});

// delete delivery address
const deleteDeliveryAddress = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await CustomerServices.deleteDeliveryAddress(
    req.params.addressId,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Deleted Delivery Address',
    target: `Delivery Address #${req.params.addressId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
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
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
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
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
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
