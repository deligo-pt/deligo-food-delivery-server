import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { VendorServices } from './vendor.service';
import { AuthUser } from '../../constant/user.constant';

// Vendor Update Controller
const vendorUpdate = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const profilePhoto = req.file?.path as string;
  const result = await VendorServices.vendorUpdate(
    req.params.vendorId,
    req?.body,
    currentUser,
    profilePhoto
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
  const result = await VendorServices.vendorDocImageUpload(
    file?.path,
    req.body,
    req.user as AuthUser,
    req.params.vendorId
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.existingVendor,
  });
});

// get all vendors
const getAllVendors = catchAsync(async (req, res) => {
  const result = await VendorServices.getAllVendors(req.query);

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
  const result = await VendorServices.getSingleVendorFromDB(
    req.params.vendorId,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor Retrieved Successfully',
    data: result,
  });
});

export const VendorControllers = {
  vendorUpdate,
  vendorDocImageUpload,
  getAllVendors,
  getSingleVendor,
};
