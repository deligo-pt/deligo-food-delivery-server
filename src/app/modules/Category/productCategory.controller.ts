import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TImageFile } from '../../interfaces/image.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { ProductCategoryService } from './productCategory.service';
import { formatProductCategoryResponse } from './category.utils';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// Create Product Category Controllers
const createProductCategory = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const currentUser = req.user as TCurrentUser;

  const result = await ProductCategoryService.createProductCategory(
    req.body,
    file?.path ?? null,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created Product Category',
    target: req.body?.name?.en || req.body?.name?.pt || 'New Product Category',
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

// Update Product Category Controllers
const updateProductCategory = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const currentUser = req.user as TCurrentUser;
  const categoryId = req.params.id;

  const result = await ProductCategoryService.updateProductCategory(
    categoryId,
    req.body,
    file?.path ?? null,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Product Category',
    target:
      req.body?.name?.en ||
      req.body?.name?.pt ||
      `Product Category #${categoryId}`,
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

// Get Product Category Controllers (No Log)
const getAllProductCategories = catchAsync(async (req, res) => {
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
    formattedData = formatProductCategoryResponse(result.data, req.lang);
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

// Get Product Category Controllers Public (No Log)
const getAllProductCategoriesPublic = catchAsync(async (req, res) => {
  const result = await ProductCategoryService.getAllProductCategoriesPublic(
    req.query,
  );

  const formattedData = formatProductCategoryResponse(result.data, req.lang);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: formattedData,
  });
});

// Get Single Product Category Controllers (No Log)
const getSingleProductCategory = catchAsync(async (req, res) => {
  const user = req.user as TCurrentUser;
  const role = user?.role;
  const result = await ProductCategoryService.getSingleProductCategory(
    req.params.id,
    user,
  );

  let formattedData;

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    formattedData = result?.data;
  } else {
    formattedData = formatProductCategoryResponse(result?.data, req.lang);
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

// Get Single Product Category Controllers Public (No Log)
const getSingleProductCategoryPublic = catchAsync(async (req, res) => {
  const result = await ProductCategoryService.getSingleProductCategoryPublic(
    req.params.id,
  );

  const formattedData = formatProductCategoryResponse(result?.data, req.lang);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

// soft Delete Product Category Controllers
const softDeleteProductCategory = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const categoryId = req.params.id;

  const result =
    await ProductCategoryService.softDeleteProductCategory(categoryId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted Product Category',
    target: `Product Category #${categoryId}`,
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

// Permanent Delete Product Category Controllers
const permanentDeleteProductCategory = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const categoryId = req.params.id;

  const result =
    await ProductCategoryService.permanentDeleteProductCategory(categoryId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Permanently Deleted Product Category',
    target: `Product Category #${categoryId}`,
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
