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

/// fleet manager soft delete Route
router.patch(
  '/:userId/soft-delete',
  auth('FLEET_MANAGER', 'SUPER_ADMIN', 'ADMIN'),
  FleetManagerControllers.fleetManagerSoftDelete
);

// fleet manager permanent delete Route
router.delete(
  '/:userId/permanent-delete',
  auth('SUPER_ADMIN'),
  FleetManagerControllers.fleetManagerPermanentDelete
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
