import { Router } from 'express';
import auth from '../../middlewares/auth';
import { SosController } from './sos.controller';
import validateRequest from '../../middlewares/validateRequest';
import { SosValidation } from './sos.validation';

const router = Router();

// trigger sos route
router.post(
  '/trigger',
  auth('ADMIN', 'DELIVERY_PARTNER', 'VENDOR', 'SUB_VENDOR', 'FLEET_MANAGER'),
  validateRequest(SosValidation.createSosValidationSchema),
  SosController.triggerSos,
);

// update sos status route
router.patch(
  '/:id/status',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(SosValidation.updateSosStatusSchema),
  SosController.updateSosStatus,
);

// get nearby sos alerts route
router.get(
  '/nearby',
  auth('ADMIN', 'SUPER_ADMIN'),
  SosController.getNearbySosAlerts,
);

// get all sos alerts route
router.get('/', auth('ADMIN', 'SUPER_ADMIN'), SosController.getAllSosAlerts);

// get single sos alert route
router.get(
  '/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  SosController.getSingleSosAlert,
);

// get sos alerts by user id route
router.get(
  '/user/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  SosController.getUserSosHistory,
);

export const sosRoutes = router;
