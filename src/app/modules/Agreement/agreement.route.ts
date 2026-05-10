import express from 'express';
import { AgreementController } from './agreement.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AgreementValidation } from './agreement.validation';

const router = express.Router();

router.post(
  '/initiate',
  validateRequest(AgreementValidation.initiateAgreementValidationSchema),
  AgreementController.initiateAgreement,
);

router.post(
  '/verify-otp',
  validateRequest(AgreementValidation.verifyAgreementOtpValidationSchema),
  AgreementController.verifyAgreementOtp,
);

router.post(
  '/resend-otp',
  validateRequest(AgreementValidation.resendAgreementOtpValidationSchema),
  AgreementController.resendAgreementOtp,
);

router.post(
  '/sign/:agreementId',
  validateRequest(AgreementValidation.signAgreementValidationSchema),
  AgreementController.signAgreement,
);

router.get('/:agreementId', AgreementController.getAgreementById);

export const AgreementRoutes = router;
