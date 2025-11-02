import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ProductServices } from './product.service';
import { AuthUser } from '../../constant/user.const';

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
    fileUrls
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
    fileUrls
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product updated successfully',
    data: result,
  });
});

//product image delete controller
const deleteProductImages = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const images = req.body.images;

  const result = await ProductServices.deleteProductImages(productId, images);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product images deleted successfully',
    data: result,
  });
});

// get all products by vendor controller
const getAllProductsByVendor = catchAsync(async (req, res) => {
  const result = await ProductServices.getAllProductsByVendor(
    req.user.id,
    req.query
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Products retrieved successfully',
    data: result,
  });
});

// get single product by vendor controller
const getSingleProductByVendor = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.getSingleProductByVendor(
    req.user.id,
    productId
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product retrieved successfully',
    data: result,
  });
});

// get all products controller
const getAllProducts = catchAsync(async (req, res) => {
  const result = await ProductServices.getAllProducts(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Products retrieved successfully',
    data: result,
  });
});

// get single product controller
const getSingleProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await ProductServices.getSingleProduct(productId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product retrieved successfully',
    data: result,
  });
});

export const ProductControllers = {
  productCreate,
  getAllProducts,
  getSingleProduct,
  getAllProductsByVendor,
  getSingleProductByVendor,
  updateProduct,
  deleteProductImages,
};
