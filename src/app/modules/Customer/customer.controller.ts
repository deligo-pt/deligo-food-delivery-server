import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthUser } from '../../constant/user.constant';
import { CustomerServices } from './customer.service';

// Customer Update Controller
const updateCustomer = catchAsync(async (req, res) => {
  const user = req.user as AuthUser;
  const profilePhoto = req.file?.path;
  const result = await CustomerServices.updateCustomer(
    req.body,
    req.params.customerId,
    user,
    profilePhoto
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Customer updated successfully',
    data: result,
  });
});

// add delivery address
const addDeliveryAddress = catchAsync(async (req, res) => {
  const { deliveryAddress } = req.body;
  const result = await CustomerServices.addDeliveryAddress(
    deliveryAddress,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery address added successfully',
    data: result,
  });
});

// toggle delivery address status
const toggleDeliveryAddressStatus = catchAsync(async (req, res) => {
  const result = await CustomerServices.toggleDeliveryAddressStatus(
    req.params.addressId,
    req.user as AuthUser
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
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Delivery address deleted successfully',
    data: result,
  });
});

// get all customers
const getAllCustomers = catchAsync(async (req, res) => {
  const result = await CustomerServices.getAllCustomersFromDB(
    req.query,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Customers Retrieved Successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// get single customer
const getSingleCustomer = catchAsync(async (req, res) => {
  const customer = await CustomerServices.getSingleCustomerFromDB(
    req.params.customerId,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Customer Retrieved Successfully',
    data: customer,
  });
});

export const CustomerControllers = {
  updateCustomer,
  addDeliveryAddress,
  toggleDeliveryAddressStatus,
  deleteDeliveryAddress,
  getAllCustomers,
  getSingleCustomer,
};
