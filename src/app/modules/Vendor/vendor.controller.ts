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

export const VendorControllers = {
  vendorUpdate,
  vendorDocImageUpload,
  submitVendorForApproval,
  vendorDelete,
};
