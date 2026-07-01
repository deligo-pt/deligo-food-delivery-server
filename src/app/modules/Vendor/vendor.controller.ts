import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { VendorServices } from './vendor.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';

// Vendor Update Controller
const vendorUpdate = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
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
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});
//  vendor doc image upload controller
const vendorDocImageUpload = catchAsync(async (req, res) => {
  const result = await VendorServices.vendorDocImageUpload(
    req.body,
    req.user as TCurrentUser,
    req.params.vendorId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const deleteVendorDocument = catchAsync(async (req, res) => {
  const result = await VendorServices.deleteVendorDocument(
    req.body,
    req.user as TCurrentUser,
    req.params.vendorId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// vendor live location update controller
const updateVendorLiveLocation = catchAsync(async (req, res) => {
  const result = await VendorServices.updateVendorLiveLocation(
    req.body,
    req.user as TCurrentUser,
    req.params.vendorId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// toggle vendor store open/close controller
const toggleVendorStoreOpenClose = catchAsync(async (req, res) => {
  const result = await VendorServices.toggleVendorStoreOpenClose(
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

// get all vendors
const getAllVendors = catchAsync(async (req, res) => {
  const result = await VendorServices.getAllVendors(
    req.query,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single vendor
const getSingleVendor = catchAsync(async (req, res) => {
  const result = await VendorServices.getSingleVendor(
    req.params.vendorId,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// get all vendors for customer
const getAllVendorsForCustomer = catchAsync(async (req, res) => {
  const result = await VendorServices.getAllVendorsForCustomer(
    req.query,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single vendor for customer
const getSingleVendorForCustomer = catchAsync(async (req, res) => {
  const result = await VendorServices.getSingleVendorForCustomer(
    req.params.vendorId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const getAllVendorsForCustomerPublic = catchAsync(async (req, res) => {
  const result = await VendorServices.getAllVendorsForCustomerPublic(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

export const VendorControllers = {
  vendorUpdate,
  vendorDocImageUpload,
  deleteVendorDocument,
  updateVendorLiveLocation,
  toggleVendorStoreOpenClose,
  getAllVendors,
  getSingleVendor,
  getAllVendorsForCustomer,
  getSingleVendorForCustomer,
  getAllVendorsForCustomerPublic,
};
