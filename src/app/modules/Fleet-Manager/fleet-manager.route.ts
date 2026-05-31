import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { FleetManagerControllers } from './fleet-manager.controller';
import { FleetManagerValidation } from './fleet-manager.validation';

const router = Router();

// Fleet Manager update Route
router.patch(
  '/:fleetManagerId',
  auth('FLEET_MANAGER', 'SUPER_ADMIN', 'ADMIN')(),
  validateRequest(FleetManagerValidation.fleetManagerUpdateValidationSchema),
  FleetManagerControllers.fleetManagerUpdate,
);

// fleet manager doc image upload route
router.patch(
  '/:fleetManagerId/docImage',
  auth('FLEET_MANAGER', 'SUPER_ADMIN', 'ADMIN')(),
  validateRequest(FleetManagerValidation.fleetManagerDocImageValidationSchema),
  FleetManagerControllers.fleetManagerDocImageUpload,
);

// fleet manager document delete route
router.delete(
  '/:fleetManagerId/docImage',
  auth('FLEET_MANAGER', 'SUPER_ADMIN', 'ADMIN')(),
  validateRequest(
    FleetManagerValidation.fleetManagerDocImageDeleteValidationSchema,
  ),
  FleetManagerControllers.deleteFleetManagerDocument,
);

router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN')(),
  FleetManagerControllers.getAllFleetManagers,
);
router.get(
  '/:fleetManagerId',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')(),
  FleetManagerControllers.getSingleFleetManager,
);

export const FleetManagerRoutes = router;
