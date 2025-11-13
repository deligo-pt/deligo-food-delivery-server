import httpStatus from 'http-status';
import { CategoryService } from './category.service';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthUser } from '../../constant/user.const';

// Create Business Category Controllers
const createBusinessCategory = catchAsync(async (req, res) => {
  const result = await CategoryService.createBusinessCategory(
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Business category created successfully',
    data: result,
  });
});

// Get Business Category Controllers
const getAllBusinessCategories = catchAsync(async (req, res) => {
  const result = await CategoryService.getAllBusinessCategories(
    req.query,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business categories fetched successfully',
    data: result,
  });
});

// Get Single Business Category Controllers
const getSingleBusinessCategory = catchAsync(async (req, res) => {
  const result = await CategoryService.getSingleBusinessCategory(
    req.params.id,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business category fetched successfully',
    data: result,
  });
});

// Update Business Category Controllers
const updateBusinessCategory = catchAsync(async (req, res) => {
  const result = await CategoryService.updateBusinessCategory(
    req.params.id,
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business category updated successfully',
    data: result,
  });
});

// soft Delete Business Category Controllers
const softDeleteBusinessCategory = catchAsync(async (req, res) => {
  const result = await CategoryService.softDeleteBusinessCategory(
    req.params.id,
    req.user as AuthUser
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
  const result = await CategoryService.permanentDeleteBusinessCategory(
    req.params.id,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

// Create Product Category Controllers
const createProductCategory = catchAsync(async (req, res) => {
  const result = await CategoryService.createProductCategory(
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Product category created successfully',
    data: result,
  });
});

// Get Product Category Controllers
const getAllProductCategories = catchAsync(async (req, res) => {
  const result = await CategoryService.getAllProductCategories(
    req.query,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product categories fetched successfully',
    data: result,
  });
});

// Get Single Product Category Controllers
const getSingleProductCategory = catchAsync(async (req, res) => {
  const result = await CategoryService.getSingleProductCategory(
    req.params.id,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product category fetched successfully',
    data: result,
  });
});

// Update Product Category Controllers
const updateProductCategory = catchAsync(async (req, res) => {
  const result = await CategoryService.updateProductCategory(
    req.params.id,
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product category updated successfully',
    data: result,
  });
});

// soft Delete Product Category Controllers
const softDeleteProductCategory = catchAsync(async (req, res) => {
  const result = await CategoryService.softDeleteProductCategory(
    req.params.id,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

// Permanent Delete Product Category Controllers
const permanentDeleteProductCategory = catchAsync(async (req, res) => {
  const result = await CategoryService.permanentDeleteProductCategory(
    req.params.id,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

export const CategoryController = {
  createBusinessCategory,
  getAllBusinessCategories,
  getSingleBusinessCategory,
  updateBusinessCategory,
  softDeleteBusinessCategory,
  permanentDeleteBusinessCategory,
  createProductCategory,
  getAllProductCategories,
  getSingleProductCategory,
  updateProductCategory,
  softDeleteProductCategory,
  permanentDeleteProductCategory,
};
