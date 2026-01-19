import { Router } from 'express';
import { CategoryController } from './category.controller';
import validateRequest from '../../middlewares/validateRequest';
import { CategoryValidation } from './category.validation';
import auth from '../../middlewares/auth';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';

const router = Router();

// Create Business Category Routes
router.post(
  '/businessCategory',
  multerUpload.single('file'),
  parseBody,
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CategoryValidation.createBusinessCategoryValidationSchema),
  CategoryController.createBusinessCategory,
);

// Update Business Category
router.patch(
  '/businessCategory/:id',
  multerUpload.single('file'),
  parseBody,
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CategoryValidation.updateBusinessCategoryValidationSchema),
  CategoryController.updateBusinessCategory,
);

// Get All Business Categories
router.get(
  '/businessCategory',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'FLEET_MANAGER',
    'VENDOR',
    'SUB_VENDOR',
    'CUSTOMER',
  ),
  CategoryController.getAllBusinessCategories,
);

// Get Single Business Category
router.get(
  '/businessCategory/:id',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'FLEET_MANAGER',
    'VENDOR',
    'SUB_VENDOR',
    'CUSTOMER',
  ),
  CategoryController.getSingleBusinessCategory,
);

// soft Delete Business Category
router.delete(
  '/businessCategory/soft-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  CategoryController.softDeleteBusinessCategory,
);

// Permanent Delete Business Category
router.delete(
  '/businessCategory/permanent-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  CategoryController.permanentDeleteBusinessCategory,
);

//Create Product Category Routes
router.post(
  '/productCategory',
  multerUpload.single('file'),
  parseBody,
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CategoryValidation.createProductCategoryValidationSchema),
  CategoryController.createProductCategory,
);

// Update Product Category
router.patch(
  '/productCategory/:id',
  multerUpload.single('file'),
  parseBody,
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CategoryValidation.updateProductCategoryValidationSchema),
  CategoryController.updateProductCategory,
);

// Get All Product Categories
router.get(
  '/productCategory',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR', 'CUSTOMER'),
  CategoryController.getAllProductCategories,
);

// Get Single Product Category
router.get(
  '/productCategory/:id',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR', 'CUSTOMER'),
  CategoryController.getSingleProductCategory,
);

// Soft Delete Product Category
router.delete(
  '/productCategory/soft-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  CategoryController.softDeleteProductCategory,
);

// Permanent Delete Product Category
router.delete(
  '/productCategory/permanent-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  CategoryController.permanentDeleteProductCategory,
);

export const CategoryRoutes = router;
