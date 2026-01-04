import { Router } from 'express';
import auth from '../../middlewares/auth';
import { AddOnsControllers } from './addOns.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AddOnsValidation } from './addOns.validation';

const router = Router();

// create addon group
router.post(
  '/create-group',
  auth('VENDOR', 'SUB_VENDOR'),
  validateRequest(AddOnsValidation.createAddonGroupValidationSchema),
  AddOnsControllers.createAddonGroup
);

// update addon group
router.patch(
  '/:addonGroupId',
  auth('VENDOR', 'SUB_VENDOR'),
  validateRequest(AddOnsValidation.updateAddonGroupValidationSchema),
  AddOnsControllers.updateAddonGroup
);

// add option to addon group
router.patch(
  '/:addonGroupId/add-option',
  auth('VENDOR', 'SUB_VENDOR'),
  AddOnsControllers.addOptionToGroup
);

// delete option from addon group
router.delete(
  '/:addonGroupId/delete-option',
  auth('VENDOR', 'SUB_VENDOR'),
  AddOnsControllers.deleteOptionFromGroup
);

// get all addon groups
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR', 'CUSTOMER'),
  AddOnsControllers.getAllAddonGroups
);

// get single addon group
router.get(
  '/:addonGroupId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR', 'CUSTOMER'),
  AddOnsControllers.getSingleAddonGroup
);

// toggle option status
router.patch(
  '/:addonGroupId/toggle-option-status',
  auth('VENDOR', 'SUB_VENDOR'),
  AddOnsControllers.toggleOptionStatus
);

// soft delete addon group
router.delete(
  '/:addonGroupId/soft-delete',
  auth('VENDOR', 'SUB_VENDOR'),
  AddOnsControllers.softDeleteAddonGroup
);

export const AddOnsRoutes = router;
