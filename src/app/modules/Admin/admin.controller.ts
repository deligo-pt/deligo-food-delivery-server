import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AdminServices } from './admin.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

//  Admin update Controller
const updateAdmin = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const adminId = req.params.adminId;
  const result = await AdminServices.updateAdmin(
    req.body,
    adminId,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Admin Profile',
    target: `Admin #${adminId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// admin doc image upload controller
const adminDocImageUpload = catchAsync(async (req, res) => {
  const file = req.file;
  const adminId = req.params.adminId;
  const currentUser = req.user as TCurrentUser;

  const result = await AdminServices.adminDocImageUpload(
    file?.path,
    req.body,
    currentUser,
    adminId,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Uploaded Admin Document',
    target: req.body?.docImageTitle || `Admin #${adminId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// Get all Admin Controller (No Log Needed)
const getAllAdmins = catchAsync(async (req, res) => {
  const result = await AdminServices.getAllAdmins(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: result?.data,
  });
});

// Get single Admin Controller (No Log Needed)
const getSingleAdmin = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await AdminServices.getSingleAdmin(
    req.params.adminId,
    currentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

export const AdminControllers = {
  updateAdmin,
  adminDocImageUpload,
  getAllAdmins,
  getSingleAdmin,
};
