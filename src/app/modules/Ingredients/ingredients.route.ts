import { Router } from "express";
import auth from "../../middlewares/auth";
import { multerUpload } from "../../config/multer.config";
import { parseBody } from "../../middlewares/bodyParser";
import validateRequest from "../../middlewares/validateRequest";
import { IngredientValidation } from "./ingredients.validation";
import { IngredientsController } from "./ingredients.controller";


const router = Router();

router.post(
    '/create-ingredient',
    auth('ADMIN', 'SUPER_ADMIN'),
    multerUpload.single('file'),
    parseBody,
    validateRequest(IngredientValidation.createIngredientValidationSchema),
    IngredientsController.createIngredient,
);

router.post(
    '/update-ingredient',
    auth('ADMIN', 'SUPER_ADMIN'),
    multerUpload.single('file'),
    parseBody,
    validateRequest(IngredientValidation.updateIngredientValidationSchema),
    IngredientsController.updateIngredient,
);


export const IngredientRoutes = router;