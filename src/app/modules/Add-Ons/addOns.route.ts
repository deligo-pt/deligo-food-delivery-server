import { Router } from 'express';
import auth from '../../middlewares/auth';
import { AddOnsControllers } from './addOns.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AddOnsValidation } from './addOns.validation';

const router = Router();

router.post(
  '/create-group',
  auth('VENDOR', 'SUB_VENDOR'),
  validateRequest(AddOnsValidation.createAddonGroupValidationSchema),
  AddOnsControllers.createAddonGroup
);

router.get(
  '/',
  auth('ADMIN', 'VENDOR', 'SUB_VENDOR', 'CUSTOMER'),
  AddOnsControllers.getAllAddonGroups
);

router.patch(
  '/:addonGroupId/add-option',
  auth('VENDOR', 'SUB_VENDOR'),
  AddOnsControllers.addOptionToGroup
);

router.delete(
  '/:addonGroupId/delete-option',
  auth('VENDOR', 'SUB_VENDOR'),
  AddOnsControllers.deleteOptionFromGroup
);

router.patch(
  '/:addonGroupId',
  auth('VENDOR', 'SUB_VENDOR'),
  validateRequest(AddOnsValidation.updateAddonGroupValidationSchema),
  AddOnsControllers.updateAddonGroup
);

export const AddOnsRoutes = router;
