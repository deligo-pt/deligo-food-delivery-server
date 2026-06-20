import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { CategoryValidation } from './category.validation';
import auth from '../../middlewares/auth';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';
import { BusinessCategoryController } from './businessCategory.controller';
import { ProductCategoryController } from './productCategory.controller';
import { CuisineController } from './cuisineCategory.controller';

const router = Router();

// Create Business Category Routes
router.post(
  '/businessCategory',
  multerUpload.single('file'),
  parseBody,
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CategoryValidation.createBusinessCategoryValidationSchema),
  BusinessCategoryController.createBusinessCategory,
);

// Update Business Category
router.patch(
  '/businessCategory/:id',
  multerUpload.single('file'),
  parseBody,
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CategoryValidation.updateBusinessCategoryValidationSchema),
  BusinessCategoryController.updateBusinessCategory,
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
  BusinessCategoryController.getAllBusinessCategories,
);

// Get All Business Categories Public
router.get(
  '/businessCategory/open',
  BusinessCategoryController.getAllBusinessCategoriesPublic,
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
  BusinessCategoryController.getSingleBusinessCategory,
);

// Get Single Business Category Public
router.get(
  '/businessCategory/open/:id',
  BusinessCategoryController.getSingleBusinessCategoryPublic,
);

// soft Delete Business Category
router.delete(
  '/businessCategory/soft-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  BusinessCategoryController.softDeleteBusinessCategory,
);

// Permanent Delete Business Category
router.delete(
  '/businessCategory/permanent-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  BusinessCategoryController.permanentDeleteBusinessCategory,
);

//Create Product Category Routes
router.post(
  '/productCategory',
  multerUpload.single('file'),
  parseBody,
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CategoryValidation.createProductCategoryValidationSchema),
  ProductCategoryController.createProductCategory,
);

// Update Product Category
router.patch(
  '/productCategory/:id',
  multerUpload.single('file'),
  parseBody,
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(CategoryValidation.updateProductCategoryValidationSchema),
  ProductCategoryController.updateProductCategory,
);

// Get All Product Categories
router.get(
  '/productCategory',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR', 'CUSTOMER'),
  ProductCategoryController.getAllProductCategories,
);
// Get All Product Categories Public
router.get(
  '/productCategory/open',
  ProductCategoryController.getAllProductCategoriesPublic,
);

// Get Single Product Category
router.get(
  '/productCategory/:id',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR', 'CUSTOMER'),
  ProductCategoryController.getSingleProductCategory,
);
// Get Single Product Category Public
router.get(
  '/productCategory/open/:id',
  ProductCategoryController.getSingleProductCategoryPublic,
);

// Soft Delete Product Category
router.delete(
  '/productCategory/soft-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  ProductCategoryController.softDeleteProductCategory,
);

// Permanent Delete Product Category
router.delete(
  '/productCategory/permanent-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  ProductCategoryController.permanentDeleteProductCategory,
);

// ==================== Public Routes ====================

// Get all cuisines for public app view
router.get('/cuisine/open', CuisineController.getAllCuisinesPublic);

// Get single cuisine details for public app view
router.get('/cuisine/open/:id', CuisineController.getSingleCuisinePublic);

// =================== Protected Routes ===================

// Get all cuisines (Supports Admin dashboard layout and filtered Vendor views)
router.get(
  '/cuisine',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  CuisineController.getAllCuisines,
);

// Get single cuisine details (Protected layout verification)
router.get(
  '/cuisine/:id',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  CuisineController.getSingleCuisine,
);

// Create new cuisine (Admin/Super Admin only + handles single image file upload)
router.post(
  '/cuisine/create',
  auth('ADMIN', 'SUPER_ADMIN'),
  multerUpload.single('file'),
  parseBody,
  validateRequest(CategoryValidation.createCuisineValidationSchema),
  CuisineController.createCuisine,
);

// Update cuisine details or switch status toggle (Admin/Super Admin only)
router.patch(
  '/cuisine/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  multerUpload.single('file'),
  parseBody,
  validateRequest(CategoryValidation.updateCuisineValidationSchema),
  CuisineController.updateCuisine,
);

// Soft delete a cuisine (Hides it safely before final removal check)
router.delete(
  '/cuisine/soft-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  CuisineController.softDeleteCuisine,
);

// Permanent delete cuisine (Hard removal from DB + deletes Cloudinary storage image)
router.delete(
  '/cuisine/permanent-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  CuisineController.permanentDeleteCuisine,
);

export const CategoryRoutes = router;
