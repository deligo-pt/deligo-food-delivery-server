import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ProductServices } from './product.service';
import { AuthUser } from '../../constant/user.const';

// Product create Controller
const productCreate = catchAsync(async (req, res) => {
  const result = await ProductServices.createProduct(
    req.body,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Product created successfully',
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
};
