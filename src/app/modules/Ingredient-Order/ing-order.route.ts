import { Router } from "express";
import auth from "../../middlewares/auth";
import { IngredientOrderController } from "./ing-order.controller";


const router = Router();

router.post(
    '/',
    auth('VENDOR', 'SUB_VENDOR'),
    IngredientOrderController.confirmIngredientOrder,
);

router.get(
    '/vendor/my-orders',
    auth("VENDOR", "SUB_VENDOR"),
    IngredientOrderController.getMyIngredientOrders
);

router.get(
    '/admin/all',
    auth("ADMIN", "SUPER_ADMIN"),
    IngredientOrderController.getAllIngredientOrdersForAdmin
);

export const IngredientOrderRoutes = router;