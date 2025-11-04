import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { multerUpload } from '../../config/multer.config';
import { FleetManagerControllers } from './fleet-manager.controller';
import { FleetManagerValidation } from './fleet-manager.validation';

const router = Router();

// Agent update Route
router.patch(
  '/:id',
  auth('FLEET_MANAGER', 'SUPER_ADMIN', 'ADMIN'),
  validateRequest(FleetManagerValidation.fleetManagerUpdateValidationSchema),
  FleetManagerControllers.fleetManagerUpdate
);

// fleet manager doc image upload route
router.patch(
  '/:id/docImage',
  auth('FLEET_MANAGER', 'SUPER_ADMIN', 'ADMIN'),
  multerUpload.single('file'),
  FleetManagerControllers.fleetManagerDocImageUpload
);

// submit fleet manager for approval Route
router.patch(
  '/:id/submitForApproval',
  auth('FLEET_MANAGER', 'SUPER_ADMIN', 'ADMIN'),
  FleetManagerControllers.submitFleetManagerForApproval
);

// fleet manager delete Route
router.delete(
  '/:id',
  auth('FLEET_MANAGER', 'SUPER_ADMIN', 'ADMIN'),
  FleetManagerControllers.fleetManagerDelete
);

router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN'),
  FleetManagerControllers.getAllFleetManagers
);
router.get(
  '/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  FleetManagerControllers.getSingleFleetManager
);

export const FleetManagerRoutes = router;
