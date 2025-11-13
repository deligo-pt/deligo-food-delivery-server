import { Router } from 'express';
import { CategoryController } from './category.controller';
import validateRequest from '../../middlewares/validateRequest';
import { CategoryValidation } from './category.validation';
import auth from '../../middlewares/auth';

const router = Router();

// Create Business Category Routes
router.post(
  '/businessCategory',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CategoryValidation.createBusinessCategoryValidationSchema),
  CategoryController.createBusinessCategory
);

// Get All Business Categories
router.get(
  '/businessCategory',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'VENDOR'),
  CategoryController.getAllBusinessCategories
);

// Get Single Business Category
router.get(
  '/businessCategory/:id',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'VENDOR'),
  CategoryController.getSingleBusinessCategory
);

// Update Business Category
router.patch(
  '/businessCategory/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CategoryValidation.updateBusinessCategoryValidationSchema),
  CategoryController.updateBusinessCategory
);

// soft Delete Business Category
router.delete(
  '/businessCategory/soft-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  CategoryController.softDeleteBusinessCategory
);

// Permanent Delete Business Category
router.delete(
  '/businessCategory/permanent-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  CategoryController.permanentDeleteBusinessCategory
);

//Create Product Category Routes
router.post(
  '/productCategory',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CategoryValidation.createProductCategoryValidationSchema),
  CategoryController.createProductCategory
);

// Get All Product Categories
router.get(
  '/productCategory',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR'),
  CategoryController.getAllProductCategories
);

// Get Single Product Category
router.get(
  '/productCategory/:id',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR'),
  CategoryController.getSingleProductCategory
);

// Update Product Category
router.patch(
  '/productCategory/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CategoryValidation.updateProductCategoryValidationSchema),
  CategoryController.updateProductCategory
);

// Soft Delete Product Category
router.delete(
  '/productCategory/soft-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  CategoryController.softDeleteProductCategory
);

// Permanent Delete Product Category
router.delete(
  '/productCategory/permanent-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  CategoryController.permanentDeleteProductCategory
);

export const CategoryRoutes = router;
