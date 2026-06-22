import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TImageFile } from '../../interfaces/image.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { BusinessCategoryService } from './businessCategory.service';

// Create Business Category Controllers
const createBusinessCategory = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const result = await BusinessCategoryService.createBusinessCategory(
    req.body,
    file?.path ?? null,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Business category created successfully',
    data: result,
  });
});

// Update Business Category Controllers
const updateBusinessCategory = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const result = await BusinessCategoryService.updateBusinessCategory(
    req.params.id,
    req.body,
    file?.path ?? null,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business category updated successfully',
    data: result,
  });
});

// Get Business Category Controllers
const getAllBusinessCategories = catchAsync(async (req, res) => {
  const lng = (req.headers['accept-language'] as 'en' | 'pt') || 'en';
  const result = await BusinessCategoryService.getAllBusinessCategories(
    req.query,
    req.user as TCurrentUser,
    lng,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business categories fetched successfully',
    data: result,
  });
});

// Get Business Category Controllers Public
const getAllBusinessCategoriesPublic = catchAsync(async (req, res) => {
  const result = await BusinessCategoryService.getAllBusinessCategoriesPublic(
    req.query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business categories fetched successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// Get Single Business Category Controllers
const getSingleBusinessCategory = catchAsync(async (req, res) => {
  const result = await BusinessCategoryService.getSingleBusinessCategory(
    req.params.id,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business category fetched successfully',
    data: result,
  });
});

// Get Single Business Category Controllers Public
const getSingleBusinessCategoryPublic = catchAsync(async (req, res) => {
  const result = await BusinessCategoryService.getSingleBusinessCategoryPublic(
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business category fetched successfully',
    data: result,
  });
});

// soft Delete Business Category Controllers
const softDeleteBusinessCategory = catchAsync(async (req, res) => {
  const result = await BusinessCategoryService.softDeleteBusinessCategory(
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

// Permanent Delete Business Category Controllers
const permanentDeleteBusinessCategory = catchAsync(async (req, res) => {
  const result = await BusinessCategoryService.permanentDeleteBusinessCategory(
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
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
