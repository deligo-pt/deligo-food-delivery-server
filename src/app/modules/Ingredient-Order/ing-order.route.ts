import { Router } from 'express';
import auth from '../../middlewares/auth';
import { IngredientOrderController } from './ing-order.controller';
import validateRequest from '../../middlewares/validateRequest';
import { IngredientOrderValidation } from './ing-order.validation';

const router = Router();

router.post(
  '/create-order',
  auth('VENDOR', 'SUB_VENDOR'),
  validateRequest(
    IngredientOrderValidation.confirmIngredientOrderValidationSchema,
  ),
  IngredientOrderController.confirmIngredientOrder,
);

router.get(
  '/vendor/my-orders',
  auth('VENDOR', 'SUB_VENDOR'),
  IngredientOrderController.getMyIngredientOrders,
);

router.get(
  '/admin/all',
  auth('ADMIN', 'SUPER_ADMIN'),
  IngredientOrderController.getAllIngredientOrdersForAdmin,
);

router.get(
  '/:orderId', // orderId eita
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  IngredientOrderController.getSingleIngredientOrder,
);

router.patch(
  '/:id/status', //_id eita
  auth('ADMIN', 'SUPER_ADMIN'),
  IngredientOrderController.updateIngredientOrderStatus,
);

export const IngredientOrderRoutes = router;
