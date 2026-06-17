import { Router } from 'express';
import auth from '../../middlewares/auth';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';
import validateRequest from '../../middlewares/validateRequest';
import { IngredientValidation } from './ingredients.validation';
import { IngredientsController } from './ingredients.controller';

const router = Router();

// 1. Create Ingredient
router.post(
  '/create-ingredient',
  auth('ADMIN', 'SUPER_ADMIN', ['CAN_MANAGE_INGREDIENTS']),
  validateRequest(IngredientValidation.createIngredientValidationSchema),
  IngredientsController.createIngredient,
);

// 2. Update ingredient
router.patch(
  '/update-ingredient/:ingredientId',
  auth('ADMIN', 'SUPER_ADMIN', ['CAN_MANAGE_INGREDIENTS']),
  validateRequest(IngredientValidation.updateIngredientValidationSchema),
  IngredientsController.updateIngredient,
);

// 3. Ingredients Details
router.get(
  '/:sku',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR', [
    'CAN_MANAGE_INGREDIENTS',
  ]),
  IngredientsController.getIngredientDetails,
);

// 4. All Ingredients
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR', [
    'CAN_MANAGE_INGREDIENTS',
  ]),
  IngredientsController.getAllIngredients,
);

export const IngredientRoutes = router;
