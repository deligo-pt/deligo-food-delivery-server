import { Router } from "express";
import auth from "../../middlewares/auth";
import { multerUpload } from "../../config/multer.config";
import { parseBody } from "../../middlewares/bodyParser";
import validateRequest from "../../middlewares/validateRequest";
import { IngredientValidation } from "./ingredients.validation";
import { IngredientsController } from "./ingredients.controller";


const router = Router();

// 1. Create Ingredient
router.post(
    '/create-ingredient',
    auth('ADMIN', 'SUPER_ADMIN'),
    multerUpload.single('file'),
    parseBody,
    validateRequest(IngredientValidation.createIngredientValidationSchema),
    IngredientsController.createIngredient,
);

// 2. Update ingredient
router.post(
    '/update-ingredient',
    auth('ADMIN', 'SUPER_ADMIN'),
    multerUpload.single('file'),
    parseBody,
    validateRequest(IngredientValidation.updateIngredientValidationSchema),
    IngredientsController.updateIngredient,
);

// 3. Ingredients Details
router.get(
    '/:id',
    auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
    IngredientsController.getIngredientDetails,
);

// 4. All Ingredients
router.get(
    '/',
    auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
    IngredientsController.getAllIngredients,
);


export const IngredientRoutes = router;