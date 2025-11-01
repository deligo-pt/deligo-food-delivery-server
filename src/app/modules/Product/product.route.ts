import express from 'express';
import auth from '../../middlewares/auth';
import { ProductControllers } from './product.controller';
import validateRequest from '../../middlewares/validateRequest';
import { ProductValidation } from './product.validation';

const router = express.Router();

// Product create
router.post(
  '/create-product',
  auth('VENDOR', 'ADMIN', 'SUPER_ADMIN'),
  validateRequest(ProductValidation.createProductValidationSchema),
  ProductControllers.productCreate
);

// Get all products by vendor
router.get(
  '/vendor/products',
  auth('VENDOR'),
  ProductControllers.getAllProductsByVendor
);

// Get single product by vendor
router.get(
  '/vendor/products/:productId',
  auth('VENDOR'),
  ProductControllers.getSingleProductByVendor
);

// Get all products
router.get('/', ProductControllers.getAllProducts);

// Get single product
router.get('/:productId', ProductControllers.getSingleProduct);

export const ProductRoutes = router;
