import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TImageFile } from '../../interfaces/image.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { CuisineService } from './cuisineCategory.service';

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
    message: 'Cuisine created successfully',
    data: result,
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
    message: 'Cuisine updated successfully',
    data: result,
  });
});

// Get All Cuisines Controller (Protected)
const getAllCuisines = catchAsync(async (req, res) => {
  const lng = (req.headers['accept-language'] as 'en' | 'pt') || 'en';
  const result = await CuisineService.getAllCuisines(
    req.query,
    req.user as TCurrentUser,
    lng,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cuisines fetched successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// Get All Cuisines Controller Public
const getAllCuisinesPublic = catchAsync(async (req, res) => {
  const result = await CuisineService.getAllCuisinesPublic(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cuisines fetched successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// Get Single Cuisine Controller (Protected)
const getSingleCuisine = catchAsync(async (req, res) => {
  const result = await CuisineService.getSingleCuisine(
    req.params.id,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cuisine fetched successfully',
    data: result,
  });
});

// Get Single Cuisine Controller Public
const getSingleCuisinePublic = catchAsync(async (req, res) => {
  const result = await CuisineService.getSingleCuisinePublic(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cuisine fetched successfully',
    data: result,
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
