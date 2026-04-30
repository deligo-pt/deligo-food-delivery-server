import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { FleetManagerControllers } from './fleet-manager.controller';
import { FleetManagerValidation } from './fleet-manager.validation';

const router = Router();

// Agent update Route
router.patch(
  '/:fleetManagerId',
  auth('FLEET_MANAGER', 'SUPER_ADMIN', 'ADMIN'),
  validateRequest(FleetManagerValidation.fleetManagerUpdateValidationSchema),
  FleetManagerControllers.fleetManagerUpdate,
);

router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN'),
  FleetManagerControllers.getAllFleetManagers,
);
router.get(
  '/:fleetManagerId',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  FleetManagerControllers.getSingleFleetManager,
);

export const FleetManagerRoutes = router;
