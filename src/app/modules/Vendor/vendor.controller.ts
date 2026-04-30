import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { VendorServices } from './vendor.service';
import { AuthUser } from '../../constant/user.constant';

// Vendor Update Controller
const vendorUpdate = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const payload = req.body;

  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    delete payload.isUpdateLocked;
    delete payload.isDeleted;
  }
  const result = await VendorServices.vendorUpdate(
    req.params.vendorId,
    payload,
    currentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor updated successfully',
    data: result,
  });
});

// vendor live location update controller
const updateVendorLiveLocation = catchAsync(async (req, res) => {
  const result = await VendorServices.updateVendorLiveLocation(
    req.body,
    req.user as AuthUser,
    req.params.vendorId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// toggle vendor store open/close controller
const toggleVendorStoreOpenClose = catchAsync(async (req, res) => {
  const result = await VendorServices.toggleVendorStoreOpenClose(
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// get all vendors
const getAllVendors = catchAsync(async (req, res) => {
  const result = await VendorServices.getAllVendors(
    req.query,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendors Retrieved Successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// get single vendor
const getSingleVendor = catchAsync(async (req, res) => {
  const result = await VendorServices.getSingleVendor(
    req.params.vendorId,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor Retrieved Successfully',
    data: result,
  });
});

// get all vendors for customer
const getAllVendorsForCustomer = catchAsync(async (req, res) => {
  const result = await VendorServices.getAllVendorsForCustomer(
    req.query,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendors Retrieved Successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

export const VendorControllers = {
  vendorUpdate,
  updateVendorLiveLocation,
  toggleVendorStoreOpenClose,
  getAllVendors,
  getSingleVendor,
  getAllVendorsForCustomer,
};
