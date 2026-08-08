import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TImageFile } from '../../interfaces/image.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { CuisineService } from './cuisineCategory.service';
import { formatCuisineResponse } from './category.utils';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

const createCuisine = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const currentUser = req.user as TCurrentUser;

  const result = await CuisineService.createCuisine(
    req.body,
    file?.path ?? null,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created New Cuisine',
    target: req.body?.name?.en || req.body?.name?.pt || 'New Cuisine',
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

// Update Cuisine Controller
const updateCuisine = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const currentUser = req.user as TCurrentUser;
  const cuisineId = req.params.id;

  const result = await CuisineService.updateCuisine(
    cuisineId,
    req.body,
    file?.path ?? null,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Cuisine',
    target: req.body?.name?.en || req.body?.name?.pt || `Cuisine #${cuisineId}`,
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

// Get All Cuisines Controller (Protected - No Log Needed)
const getAllCuisines = catchAsync(async (req, res) => {
  const user = req.user as TCurrentUser;
  const result = await CuisineService.getAllCuisines(req.query, user);

  let formattedData;
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);
  if (isAdmin) {
    formattedData = result.data;
  } else {
    formattedData = formatCuisineResponse(result.data, req.lang);
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

// Get All Cuisines Controller Public (No Log Needed)
const getAllCuisinesPublic = catchAsync(async (req, res) => {
  const result = await CuisineService.getAllCuisinesPublic(req.query);
  const formattedData = formatCuisineResponse(result.data, req.lang);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: formattedData,
  });
});

// Get Single Cuisine Controller (Protected - No Log Needed)
const getSingleCuisine = catchAsync(async (req, res) => {
  const user = req.user as TCurrentUser;
  const result = await CuisineService.getSingleCuisine(req.params.id, user);

  let formattedData;
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);
  if (isAdmin) {
    formattedData = result?.data;
  } else {
    formattedData = formatCuisineResponse(result?.data, req.lang);
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

// Get Single Cuisine Controller Public (No Log Needed)
const getSingleCuisinePublic = catchAsync(async (req, res) => {
  const result = await CuisineService.getSingleCuisinePublic(req.params.id);
  const formattedData = formatCuisineResponse(result?.data, req.lang);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

// Soft Delete Cuisine Controller
const softDeleteCuisine = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const cuisineId = req.params.id;

  const result = await CuisineService.softDeleteCuisine(cuisineId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted Cuisine',
    target: `Cuisine #${cuisineId}`,
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

// Permanent Delete Cuisine Controller
const permanentDeleteCuisine = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const cuisineId = req.params.id;

  const result = await CuisineService.permanentDeleteCuisine(cuisineId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Permanently Deleted Cuisine',
    target: `Cuisine #${cuisineId}`,
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

export const CuisineController = {
  createCuisine,
  updateCuisine,
  getAllCuisines,
  getAllCuisinesPublic,
  getSingleCuisine,
  getSingleCuisinePublic,
  softDeleteCuisine,
  permanentDeleteCuisine,
};
