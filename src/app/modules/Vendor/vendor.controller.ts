import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { VendorServices } from './vendor.service';
import { AuthUser } from '../../constant/user.const';

// Vendor Update Controller
const vendorUpdate = catchAsync(async (req, res) => {
  const user = req.user as AuthUser;
  const result = await VendorServices.vendorUpdate(
    req.params.id,
    req.body,
    user
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor updated successfully',
    data: result,
  });
});
//  vendor doc image upload controller
const vendorDocImageUpload = catchAsync(async (req, res) => {
  const file = req.file;
  const data = JSON.parse(req.body.data);
  const result = await VendorServices.vendorDocImageUpload(
    file?.path,
    data,
    req.user as AuthUser,
    req.params.id
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.existingVendor,
  });
});

// submit vendor for approval controller
const submitVendorForApproval = catchAsync(async (req, res) => {
  const result = await VendorServices.submitVendorForApproval(
    req.params.id,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.existingVendor,
  });
});

// approve or reject vendor controller
const approveOrRejectVendor = catchAsync(async (req, res) => {
  const result = await VendorServices.approveOrRejectVendor(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// vendor delete controller
const vendorDelete = catchAsync(async (req, res) => {
  const result = await VendorServices.vendorDelete(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// get all vendors
const getAllVendors = catchAsync(async (req, res) => {
  const users = await VendorServices.getAllVendors(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendors Retrieved Successfully',
    data: users,
  });
});

// get single vendor
const getSingleVendor = catchAsync(async (req, res) => {
  const user = await VendorServices.getSingleVendorFromDB(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor Retrieved Successfully',
    data: user,
  });
});

export const VendorControllers = {
  vendorUpdate,
  vendorDocImageUpload,
  approveOrRejectVendor,
  submitVendorForApproval,
  vendorDelete,
  getAllVendors,
  getSingleVendor,
};
