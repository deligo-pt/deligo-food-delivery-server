import express from 'express';
import { AgreementController } from './agreement.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AgreementValidation } from './agreement.validation';
import auth from '../../middlewares/auth';
import { SYSTEM_PERMISSIONS } from '../Permission/permission.constant';

const router = express.Router();

router.post(
  '/initiate',
  auth('ADMIN', 'SUPER_ADMIN')(),
  validateRequest(AgreementValidation.initiateAgreementValidationSchema),
  AgreementController.initiateAgreement,
);

router.post(
  '/verify-otp',
  auth('ADMIN', 'SUPER_ADMIN')(),
  validateRequest(AgreementValidation.verifyAgreementOtpValidationSchema),
  AgreementController.verifyAgreementOtp,
);

router.post(
  '/resend-otp',
  auth('ADMIN', 'SUPER_ADMIN')(),
  validateRequest(AgreementValidation.resendAgreementOtpValidationSchema),
  AgreementController.resendAgreementOtp,
);

router.post(
  '/sign/:agreementId',
  auth('ADMIN', 'SUPER_ADMIN')(),
  validateRequest(AgreementValidation.signAgreementValidationSchema),
  AgreementController.signAgreement,
);

router.get(
  '/:agreementId',
  auth('ADMIN', 'SUPER_ADMIN')(),
  AgreementController.getAgreementById,
);

router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN')(),
  AgreementController.getAllAgreements,
);

export const AgreementRoutes = router;
