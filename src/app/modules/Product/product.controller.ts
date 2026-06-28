import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ProductServices } from './product.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

// Product create Controller
const productCreate = catchAsync(async (req, res) => {
  const result = await ProductServices.createProduct(
    req.body,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// update product controller
const updateProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.updateProduct(
    productId,
    req.body,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// rename product variations controller
const renameProductVariation = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.renameProductVariation(
    productId,
    req.body,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// manage product variations controller
const manageProductVariations = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.manageProductVariations(
    productId,
    req.body,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// remove product variations controller
const removeProductVariations = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.removeProductVariations(
    productId,
    req.body,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// update inventory and pricing controller
const updateInventoryAndPricing = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { addedQuantity, newPrice, variationSku, reduceQuantity } = req.body;
  const result = await ProductServices.updateInventoryAndPricing(
    req.user as TCurrentUser,
    productId,
    addedQuantity,
    reduceQuantity,
    newPrice,
    variationSku,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// Approved product controller
const approvedProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.approvedProduct(
    productId,
    req.user as TCurrentUser,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

//product image delete controller
const deleteProductImages = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const images = req.body.images;

  const result = await ProductServices.deleteProductImages(
    productId,
    images,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
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
    message: result?.message,
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
    message: result?.message,
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
    message: result?.message,
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
    message: result?.message,
    data: result?.data,
  });
});

// soft delete product controller
const softDeleteProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.softDeleteProduct(
    productId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// product permanent delete controller
const permanentDeleteProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.permanentDeleteProduct(
    productId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
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
    message: result?.message,
    meta: result?.meta,
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
};
