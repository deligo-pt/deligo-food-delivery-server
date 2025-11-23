import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthUser } from '../../constant/user.constant';
import { AdminServices } from './admin.service';

//  Admin update  Controller
const updateAdmin = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const profilePhoto = req.file?.path as string;
  const result = await AdminServices.updateAdmin(
    req.body,
    req.params.adminId,
    currentUser,
    profilePhoto
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin update successfully',
    data: result,
  });
});

// Get all Admin Controller
const getAllAdmins = catchAsync(async (req, res) => {
  const result = await AdminServices.getAllAdmins(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admins retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Get single Admin Controller
const getSingleAdmin = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const result = await AdminServices.getSingleAdmin(
    req.params.adminId,
    currentUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin retrieved successfully',
    data: result,
  });
});

export const AdminControllers = {
  updateAdmin,
  getAllAdmins,
  getSingleAdmin,
};
