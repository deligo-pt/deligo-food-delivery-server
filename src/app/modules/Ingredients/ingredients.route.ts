import { Router } from 'express';
import auth from '../../middlewares/auth';
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

router.delete(
  '/soft-delete/:ingredientId',
  auth('ADMIN', 'SUPER_ADMIN', ['CAN_MANAGE_INGREDIENTS']),
  IngredientsController.softDeleteIngredient,
);

router.delete(
  '/permanent-delete/:ingredientId',
  auth('SUPER_ADMIN', 'ADMIN', ['CAN_MANAGE_INGREDIENTS']),
  IngredientsController.permanentDeleteIngredient,
);

export const IngredientRoutes = router;
