import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PayoutValidation } from './payout.validation';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';
import { PayoutController } from './payout.controller';

const router = Router();

// initiate payout
router.post(
  '/initiate-settlement',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  validateRequest(PayoutValidation.InitiateSettlementValidationSchema),
  PayoutController.initiateSettlement,
);

// finalize payout
router.post(
  '/finalize-settlement/:payoutId',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  multerUpload.single('file'),
  parseBody,
  validateRequest(PayoutValidation.FinalizeSettlementValidationSchema),
  PayoutController.finalizeSettlement,
);

export const PayoutRoutes = router;
