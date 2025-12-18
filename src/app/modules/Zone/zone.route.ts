import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { ZoneValidation } from './zone.validation';
import { ZoneController } from './zone.controller';
import auth from '../../middlewares/auth';

const router = Router();
// Create Zone Route
router.post(
  '/create-zone',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(ZoneValidation.createZoneSchema),
  ZoneController.createZoneController
);
// Check Point In Zone Route
router.get(
  '/check-point',
  validateRequest(ZoneValidation.checkPointInZoneSchema),
  ZoneController.checkPointInZoneController
);

// Get All Zones Route
router.get(
  '/all-zones',
  auth('ADMIN', 'SUPER_ADMIN'),
  ZoneController.getAllZonesController
);

// Get Single Zone Route
router.get(
  '/:zoneId',
  auth('ADMIN', 'SUPER_ADMIN'),
  ZoneController.getSingleZoneController
);

// Update Zone Route
router.patch(
  '/:zoneId',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(ZoneValidation.updateZoneSchema),
  ZoneController.updateZoneController
);

// Toggle Zone Operational Status Route
router.patch(
  '/:zoneId/toggle-status',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(ZoneValidation.toggleZoneStatusSchema),
  ZoneController.toggleZoneStatusController
);

// Soft Delete Zone Route
router.delete(
  '/:zoneId/soft-delete',
  auth('ADMIN', 'SUPER_ADMIN'),
  ZoneController.softDeleteZoneController
);

// Permanent Delete Zone Route
router.delete(
  '/:zoneId/permanent-delete',
  auth('ADMIN', 'SUPER_ADMIN'),
  ZoneController.permanentDeleteZoneController
);

export const ZoneRoutes = router;
