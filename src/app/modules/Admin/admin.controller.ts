import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AdminServices } from './admin.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

//  Admin update  Controller
const updateAdmin = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await AdminServices.updateAdmin(
    req.body,
    req.params.adminId,
    currentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

// admin doc image upload controller
const adminDocImageUpload = catchAsync(async (req, res) => {
  const file = req.file;
  const result = await AdminServices.adminDocImageUpload(
    file?.path,
    req.body,
    req.user as TCurrentUser,
    req.params.adminId,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

// Get all Admin Controller
const getAllAdmins = catchAsync(async (req, res) => {
  const result = await AdminServices.getAllAdmins(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

// Get single Admin Controller
const getSingleAdmin = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await AdminServices.getSingleAdmin(
    req.params.adminId,
    currentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: result?.data,
  });
});

export const AdminControllers = {
  updateAdmin,
  adminDocImageUpload,
  getAllAdmins,
  getSingleAdmin,
};
