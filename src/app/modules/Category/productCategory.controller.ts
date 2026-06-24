import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TImageFile } from '../../interfaces/image.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { ProductCategoryService } from './productCategory.service';
import { formatProductCategoryResponse } from './category.utils';

// Create Product Category Controllers
const createProductCategory = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const result = await ProductCategoryService.createProductCategory(
    req.body,
    file?.path ?? null,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Product category created successfully',
    data: result,
  });
});

// Update Product Category Controllers
const updateProductCategory = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const result = await ProductCategoryService.updateProductCategory(
    req.params.id,
    req.body,
    file?.path ?? null,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product category updated successfully',
    data: result,
  });
});

// Get Product Category Controllers
const getAllProductCategories = catchAsync(async (req, res) => {
  const lang = (req.headers['accept-language'] as 'en' | 'pt') || 'en';

  const user = req.user as TCurrentUser;
  const role = user?.role;
  const result = await ProductCategoryService.getAllProductCategories(
    req.query,
    user,
  );

  let formattedData;

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    formattedData = result.data;
  } else {
    formattedData = formatProductCategoryResponse(result.data, lang);
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product categories fetched successfully',
    meta: result?.meta,
    data: formattedData,
  });
});

// Get Product Category Controllers Public
const getAllProductCategoriesPublic = catchAsync(async (req, res) => {
  const lang = (req.headers['accept-language'] as 'en' | 'pt') || 'en';
  const role = 'CUSTOMER';
  const result = await ProductCategoryService.getAllProductCategoriesPublic(
    req.query,
    lang,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product categories fetched successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// Get Single Product Category Controllers
const getSingleProductCategory = catchAsync(async (req, res) => {
  const lang = (req.headers['accept-language'] as 'en' | 'pt') || 'en';
  const result = await ProductCategoryService.getSingleProductCategory(
    req.params.id,
    req.user as TCurrentUser,
    lang,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product category fetched successfully',
    data: result,
  });
});

// Get Single Product Category Controllers Public
const getSingleProductCategoryPublic = catchAsync(async (req, res) => {
  const lang = (req.headers['accept-language'] as 'en' | 'pt') || 'en';
  const result = await ProductCategoryService.getSingleProductCategoryPublic(
    req.params.id,
    lang,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product category fetched successfully',
    data: result,
  });
});

// soft Delete Product Category Controllers
const softDeleteProductCategory = catchAsync(async (req, res) => {
  const result = await ProductCategoryService.softDeleteProductCategory(
    req.params.id,
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
  const result = await ProductCategoryService.permanentDeleteProductCategory(
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

export const ProductCategoryController = {
  createProductCategory,
  updateProductCategory,
  getAllProductCategories,
  getAllProductCategoriesPublic,
  getSingleProductCategory,
  getSingleProductCategoryPublic,
  softDeleteProductCategory,
  permanentDeleteProductCategory,
};
