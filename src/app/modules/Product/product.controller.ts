import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ProductServices } from './product.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// Product create Controller
const productCreate = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await ProductServices.createProduct(req.body, currentUser);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created Product',
    target: req.body?.name?.en || req.body?.name?.pt || 'New Product',
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// update product controller
const updateProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await ProductServices.updateProduct(
    productId,
    req.body,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Product',
    target: req.body?.name?.en || req.body?.name?.pt || `Product #${productId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// rename product variations controller
const renameProductVariation = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await ProductServices.renameProductVariation(
    productId,
    req.body,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Renamed Product Variation',
    target: `Product #${productId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// manage product variations controller
const manageProductVariations = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await ProductServices.manageProductVariations(
    productId,
    req.body,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Managed Product Variations',
    target: `Product #${productId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// remove product variations controller
const removeProductVariations = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await ProductServices.removeProductVariations(
    productId,
    req.body,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Removed Product Variations',
    target: `Product #${productId}`,
    type: 'WARNING',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// update inventory and pricing controller
const updateInventoryAndPricing = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { addedQuantity, newPrice, variationSku, reduceQuantity } = req.body;
  const currentUser = req.user as TCurrentUser;
  const result = await ProductServices.updateInventoryAndPricing(
    currentUser,
    productId,
    addedQuantity,
    reduceQuantity,
    newPrice,
    variationSku,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Product Inventory And Pricing',
    target: `Product #${productId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// Approved product controller
const approvedProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await ProductServices.approvedProduct(
    productId,
    currentUser,
    req.body,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: req.body?.isApproved ? 'Approved Product' : 'Rejected Product',
    target: `Product #${productId}`,
    type: req.body?.isApproved ? 'INFO' : 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

//product image delete controller
const deleteProductImages = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const images = req.body.images;
  const currentUser = req.user as TCurrentUser;

  const result = await ProductServices.deleteProductImages(
    productId,
    images,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Deleted Product Images',
    target: `Product #${productId}`,
    type: 'WARNING',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// get all products controller
const getAllProducts = catchAsync(async (req, res) => {
  const result = await ProductServices.getAllProducts(
    req.query,
    req.user as TCurrentUser,
    req.lang,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: result?.data,
  });
});

// get all products controller
const getAllProductsPublic = catchAsync(async (req, res) => {
  const result = await ProductServices.getAllProductsPublic(
    req.query,
    req.lang,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single product controller
const getSingleProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.getSingleProduct(
    productId,
    req.user as TCurrentUser,
    req.lang,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});
// get single product controller
const getSingleProductPublic = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.getSingleProductPublic(
    productId,
    req.lang,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// soft delete product controller
const softDeleteProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await ProductServices.softDeleteProduct(
    productId,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted Product',
    target: `Product #${productId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// product permanent delete controller
const permanentDeleteProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await ProductServices.permanentDeleteProduct(
    productId,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Permanently Deleted Product',
    target: `Product #${productId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

const getOutOfStockAlerts = catchAsync(async (req, res) => {
  const result = await ProductServices.getOutOfStockAlerts(
    req.query,
    req.user as TCurrentUser,
    req.lang,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: result?.data,
  });
});

// notify vendor about stock alert controller
const notifyVendorStockAlert = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await ProductServices.notifyVendorStockAlert(productId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Notified Vendor About Stock Alert',
    target: `Product #${productId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

export const ProductControllers = {
  productCreate,
  updateProduct,
  manageProductVariations,
  renameProductVariation,
  removeProductVariations,
  updateInventoryAndPricing,
  approvedProduct,
  deleteProductImages,
  getAllProducts,
  getAllProductsPublic,
  getSingleProduct,
  getSingleProductPublic,
  softDeleteProduct,
  permanentDeleteProduct,
  getOutOfStockAlerts,
  notifyVendorStockAlert,
};
