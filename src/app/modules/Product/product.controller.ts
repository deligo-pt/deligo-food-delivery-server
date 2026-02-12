import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ProductServices } from './product.service';
import { AuthUser } from '../../constant/user.constant';

// Product create Controller
const productCreate = catchAsync(async (req, res) => {
  const images = req.files;
  const fileUrls = images
    ? Array.isArray(images)
      ? images.map((file) => file.path)
      : Object.values(images)
          .flat()
          .map((file) => file.path)
    : [];
  const result = await ProductServices.createProduct(
    req.body,
    req.user as AuthUser,
    fileUrls,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product created successfully',
    data: result,
  });
});

// update product controller
const updateProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const images = req.files;
  const fileUrls = images
    ? Array.isArray(images)
      ? images.map((file) => file.path)
      : Object.values(images)
          .flat()
          .map((file) => file.path)
    : [];
  const result = await ProductServices.updateProduct(
    productId,
    req.body,
    req.user as AuthUser,
    fileUrls,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product updated successfully',
    data: result,
  });
});

// manage product variations controller
const manageProductVariations = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.manageProductVariations(
    productId,
    req.body,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product variations updated successfully',
    data: result,
  });
});

// remove product variations controller
const removeProductVariations = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.removeProductVariations(
    productId,
    req.body,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product variations removed successfully',
    data: result,
  });
});

// update inventory and pricing controller
const updateInventoryAndPricing = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { addedQuantity, newPrice, variationSku, reduceQuantity } = req.body;
  const result = await ProductServices.updateInventoryAndPricing(
    req.user as AuthUser,
    productId,
    addedQuantity,
    reduceQuantity,
    newPrice,
    variationSku,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Inventory and pricing updated successfully',
    data: result,
  });
});

// Approved product controller
const approvedProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.approvedProduct(
    productId,
    req.user as AuthUser,
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
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product images deleted successfully',
    data: result,
  });
});

// get all products controller
const getAllProducts = catchAsync(async (req, res) => {
  const result = await ProductServices.getAllProducts(
    req.query,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Products retrieved successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// get single product controller
const getSingleProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.getSingleProduct(
    productId,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product retrieved successfully',
    data: result,
  });
});

// soft delete product controller
const softDeleteProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.softDeleteProduct(
    productId,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// product permanent delete controller
const permanentDeleteProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.permanentDeleteProduct(
    productId,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

export const ProductControllers = {
  productCreate,
  updateProduct,
  manageProductVariations,
  removeProductVariations,
  updateInventoryAndPricing,
  approvedProduct,
  deleteProductImages,
  getAllProducts,
  getSingleProduct,
  softDeleteProduct,
  permanentDeleteProduct,
};
