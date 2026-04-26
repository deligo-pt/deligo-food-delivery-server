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

export const RestrictedItemsRoutes = router;
