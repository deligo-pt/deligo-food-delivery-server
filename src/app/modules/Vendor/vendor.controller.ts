import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { VendorServices } from './vendor.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { formatVendorResponse } from './vendor.utils';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

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

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Vendor',
    target:
      req.body?.name?.en ||
      req.body?.name?.pt ||
      `Vendor #${req.params.vendorId}`,
    type: 'INFO',
  });

  const formattedData = formatVendorResponse(result.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});
//  vendor doc image upload controller
const vendorDocImageUpload = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await VendorServices.vendorDocImageUpload(
    req.body,
    currentUser,
    req.params.vendorId,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Uploaded Vendor Document',
    target: req.body?.docImageTitle || `Vendor #${req.params.vendorId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const deleteVendorDocument = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await VendorServices.deleteVendorDocument(
    req.body,
    currentUser,
    req.params.vendorId,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Deleted Vendor Document',
    target: req.body?.docImageTitle || `Vendor #${req.params.vendorId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// toggle vendor store open/close controller
const toggleVendorStoreOpenClose = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await VendorServices.toggleVendorStoreOpenClose(currentUser);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Toggled Vendor Store Open/Close',
    target: `Vendor #${currentUser?.userId}`,
    type: 'WARNING',
  });

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

  const formattedData = formatVendorResponse(result.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: formattedData,
  });
});

// get single vendor
const getSingleVendor = catchAsync(async (req, res) => {
  const result = await VendorServices.getSingleVendor(
    req.params.vendorId,
    req.user as TCurrentUser,
  );

  const formattedData = formatVendorResponse(result.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});

// get all vendors for customer
const getAllVendorsForCustomer = catchAsync(async (req, res) => {
  const result = await VendorServices.getAllVendorsForCustomer(
    req.query,
    req.user as TCurrentUser,
    req.lang,
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

  const formattedData = formatVendorResponse(result.data, req.lang);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});

const getAllVendorsForCustomerPublic = catchAsync(async (req, res) => {
  const result = await VendorServices.getAllVendorsForCustomerPublic(
    req.query,
    req.lang,
  );

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
  toggleVendorStoreOpenClose,
  getAllVendors,
  getSingleVendor,
  getAllVendorsForCustomer,
  getSingleVendorForCustomer,
  getAllVendorsForCustomerPublic,
};
