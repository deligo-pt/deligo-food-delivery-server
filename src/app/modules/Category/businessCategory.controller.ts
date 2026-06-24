import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TImageFile } from '../../interfaces/image.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { BusinessCategoryService } from './businessCategory.service';
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';
import { formatBusinessCategoryResponse } from './category.utils';

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
    message: 'Business categories fetched successfully',
    meta: result?.meta,
    data: formattedData,
  });
});

// Get Business Category Controllers Public
const getAllBusinessCategoriesPublic = catchAsync(async (req, res) => {
  const result = await BusinessCategoryService.getAllBusinessCategoriesPublic(
    req.query,
  );

  const formattedData = formatBusinessCategoryResponse(result.data, req.lang);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business categories fetched successfully',
    meta: result?.meta,
    data: formattedData,
  });
});

// Get Single Business Category Controllers
const getSingleBusinessCategory = catchAsync(async (req, res) => {
  const result = await BusinessCategoryService.getSingleBusinessCategory(
    req.params.id,
    req.user as TCurrentUser,
  );

  let formattedData;
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
  if (isAdmin) {
    formattedData = result;
  } else {
    formattedData = formatBusinessCategoryResponse(result, req.lang);
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business category fetched successfully',
    data: formattedData,
  });
});

// Get Single Business Category Controllers Public
const getSingleBusinessCategoryPublic = catchAsync(async (req, res) => {
  const result = await BusinessCategoryService.getSingleBusinessCategoryPublic(
    req.params.id,
  );
  const formattedData = formatBusinessCategoryResponse(result, req.lang);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business category fetched successfully',
    data: formattedData,
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
