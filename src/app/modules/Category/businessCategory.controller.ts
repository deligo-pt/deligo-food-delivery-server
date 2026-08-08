import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TImageFile } from '../../interfaces/image.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { BusinessCategoryService } from './businessCategory.service';
import { formatBusinessCategoryResponse } from './category.utils';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// Create Business Category Controllers
const createBusinessCategory = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const currentUser = req.user as TCurrentUser;

  const result = await BusinessCategoryService.createBusinessCategory(
    req.body,
    file?.path ?? null,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created Business Category',
    target: req.body?.name || 'New Category',
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// Update Business Category Controllers
const updateBusinessCategory = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const currentUser = req.user as TCurrentUser;
  const categoryId = req.params.id;

  const result = await BusinessCategoryService.updateBusinessCategory(
    categoryId,
    req.body,
    file?.path ?? null,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Business Category',
    target: req.body?.name || `Category #${categoryId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// Get Business Category Controllers (No Log)
const getAllBusinessCategories = catchAsync(async (req, res) => {
  const user = req.user as TCurrentUser;
  const result = await BusinessCategoryService.getAllBusinessCategories(
    req.query,
    user,
  );

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);

  let formattedData;
  if (isAdmin) {
    formattedData = result.data;
  } else {
    formattedData = formatBusinessCategoryResponse(result.data, req.lang);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: formattedData,
  });
});

// Get Business Category Controllers Public (No Log)
const getAllBusinessCategoriesPublic = catchAsync(async (req, res) => {
  const result = await BusinessCategoryService.getAllBusinessCategoriesPublic(
    req.query,
  );

  const formattedData = formatBusinessCategoryResponse(result.data, req.lang);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: formattedData,
  });
});

// Get Single Business Category Controllers (No Log)
const getSingleBusinessCategory = catchAsync(async (req, res) => {
  const result = await BusinessCategoryService.getSingleBusinessCategory(
    req.params.id,
    req.user as TCurrentUser,
  );

  let formattedData;
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
  if (isAdmin) {
    formattedData = result?.data;
  } else {
    formattedData = formatBusinessCategoryResponse(result?.data, req.lang);
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

// Get Single Business Category Controllers Public (No Log)
const getSingleBusinessCategoryPublic = catchAsync(async (req, res) => {
  const result = await BusinessCategoryService.getSingleBusinessCategoryPublic(
    req.params.id,
  );
  const formattedData = formatBusinessCategoryResponse(result?.data, req.lang);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

// soft Delete Business Category Controllers
const softDeleteBusinessCategory = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const categoryId = req.params.id;

  const result =
    await BusinessCategoryService.softDeleteBusinessCategory(categoryId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted Business Category',
    target: `Category #${categoryId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: null,
  });
});

// Permanent Delete Business Category Controllers
const permanentDeleteBusinessCategory = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const categoryId = req.params.id;

  const result =
    await BusinessCategoryService.permanentDeleteBusinessCategory(categoryId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Permanently Deleted Business Category',
    target: `Category #${categoryId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: null,
  });
});

export const BusinessCategoryController = {
  createBusinessCategory,
  updateBusinessCategory,
  getAllBusinessCategories,
  getAllBusinessCategoriesPublic,
  getSingleBusinessCategory,
  getSingleBusinessCategoryPublic,
  softDeleteBusinessCategory,
  permanentDeleteBusinessCategory,
};
