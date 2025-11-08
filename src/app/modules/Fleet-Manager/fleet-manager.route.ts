import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { multerUpload } from '../../config/multer.config';
import { FleetManagerControllers } from './fleet-manager.controller';
import { FleetManagerValidation } from './fleet-manager.validation';
import { parseBody } from '../../middlewares/bodyParser';

const router = Router();

// Agent update Route
router.patch(
  '/:id',
  auth('FLEET_MANAGER', 'SUPER_ADMIN', 'ADMIN'),
  multerUpload.single('file'),
  parseBody,
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
