import express from 'express';
import auth from '../../middlewares/auth';
import { ProductControllers } from './product.controller';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';
import validateRequest from '../../middlewares/validateRequest';
import { ProductValidation } from './product.validation';

const router = express.Router();

// Product create
router.post(
  '/create-product',
  auth('VENDOR', 'ADMIN', 'SUPER_ADMIN'),
  multerUpload.array('files', 5),
  parseBody,
  validateRequest(ProductValidation.createProductValidationSchema),
  ProductControllers.productCreate
);

// Product update
router.patch(
  '/:productId',
  auth('VENDOR', 'ADMIN', 'SUPER_ADMIN'),
  multerUpload.array('files'),
  parseBody,
  validateRequest(ProductValidation.updateProductValidationSchema),
  ProductControllers.updateProduct
);

// Product delete images
router.delete(
  '/:productId/images',
  auth('VENDOR', 'ADMIN', 'SUPER_ADMIN'),
  ProductControllers.deleteProductImages
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
router.get(
  '/',
  auth('CUSTOMER', 'ADMIN', 'SUPER_ADMIN'),
  ProductControllers.getAllProducts
);

// Get single product
router.get(
  '/:productId',
  auth('CUSTOMER', 'ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'DELIVERY_PARTNER'),
  ProductControllers.getSingleProduct
);

// Soft delete product
router.delete(
  '/soft-delete/:productId',
  auth('VENDOR', 'ADMIN', 'SUPER_ADMIN'),
  ProductControllers.softDeleteProduct
);

// Permanent delete product
router.delete(
  '/permanent-delete/:productId',
  auth('ADMIN', 'SUPER_ADMIN'),
  ProductControllers.permanentDeleteProduct
);
export const ProductRoutes = router;
