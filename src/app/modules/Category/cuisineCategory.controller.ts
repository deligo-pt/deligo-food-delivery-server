import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TImageFile } from '../../interfaces/image.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { CuisineService } from './cuisineCategory.service';
import { formatCuisineResponse } from './category.utils';

// Create Cuisine Controller
const createCuisine = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const result = await CuisineService.createCuisine(
    req.body,
    file?.path ?? null,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

// Update Cuisine Controller
const updateCuisine = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const result = await CuisineService.updateCuisine(
    req.params.id,
    req.body,
    file?.path ?? null,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

// Get All Cuisines Controller (Protected)
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
    message: result?.message,
    meta: result?.meta,
    data: formattedData,
  });
});

// Get All Cuisines Controller Public
const getAllCuisinesPublic = catchAsync(async (req, res) => {
  const result = await CuisineService.getAllCuisinesPublic(req.query);
  const formattedData = formatCuisineResponse(result.data, req.lang);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    meta: result?.meta,
    data: formattedData,
  });
});

// Get Single Cuisine Controller (Protected)
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
    message: result?.message,
    data: formattedData,
  });
});

// Get Single Cuisine Controller Public
const getSingleCuisinePublic = catchAsync(async (req, res) => {
  const result = await CuisineService.getSingleCuisinePublic(req.params.id);
  const formattedData = formatCuisineResponse(result?.data, req.lang);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: formattedData,
  });
});

// Soft Delete Cuisine Controller
const softDeleteCuisine = catchAsync(async (req, res) => {
  const result = await CuisineService.softDeleteCuisine(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

// Permanent Delete Cuisine Controller
const permanentDeleteCuisine = catchAsync(async (req, res) => {
  const result = await CuisineService.permanentDeleteCuisine(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
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
