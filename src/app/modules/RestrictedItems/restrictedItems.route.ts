import { Router } from 'express';
import { RestrictedItemsController } from './restrictedItems.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { RestrictedItemValidation } from './restrictedItems.validation';

const router = Router();

router.post(
  '/add',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(RestrictedItemValidation.RestrictedItemSchema),
  RestrictedItemsController.createRestrictedItem,
);

router.patch(
  '/:itemId',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(RestrictedItemValidation.RestrictedItemUpdateSchema),
  RestrictedItemsController.updateRestrictedItem,
);

router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  RestrictedItemsController.getAllRestrictedItems,
);

router.get(
  '/:itemId',
  auth('ADMIN', 'SUPER_ADMIN'),
  RestrictedItemsController.getSingleRestrictedItem,
);

export const RestrictedItemsRoutes = router;
