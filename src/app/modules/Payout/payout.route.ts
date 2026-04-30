import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PayoutValidation } from './payout.validation';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';
import { PayoutController } from './payout.controller';

const router = Router();

// initiate payout
// router.post(
//   '/initiate-settlement',
//   auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
//   validateRequest(PayoutValidation.InitiateSettlementValidationSchema),
//   PayoutController.initiateSettlement,
// );

// reject payout
// router.post(
//   '/reject-payout/:payoutId',
//   auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
//   validateRequest(PayoutValidation.RejectPayoutValidationSchema),
//   PayoutController.rejectPayout,
// );

// retry failed payout
// router.post(
//   '/retry-failed-payout/:payoutId',
//   auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
//   PayoutController.retryFailedPayout,
// );

// finalize payout
router.post(
  '/finalize-settlement/:payoutId',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  multerUpload.single('file'),
  parseBody,
  validateRequest(PayoutValidation.FinalizeSettlementValidationSchema),
  PayoutController.finalizeSettlement,
);

// get all payout
router.get(
  '/',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'SUB_VENDOR',
  ),
  PayoutController.getAllPayouts,
);

// get single payout
router.get(
  '/:payoutId',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'SUB_VENDOR',
  ),
  PayoutController.getSinglePayout,
);

export const PayoutRoutes = router;
