import { Router } from "express";
import auth from "../../middlewares/auth";
import { IngredientOrderController } from "./ing-order.controller";


const router = Router();

router.post(
    '/',
    auth('VENDOR', 'SUB_VENDOR'),
    IngredientOrderController.confirmIngredientOrder,
);

export const IngredientOrderRoutes = router;