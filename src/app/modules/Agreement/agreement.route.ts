import express from 'express';
import { AgreementController } from './agreement.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AgreementValidation } from './agreement.validation';
import auth from '../../middlewares/auth';

const router = express.Router();

router.post(
  '/initiate',
  auth('AGENT'),
  validateRequest(AgreementValidation.initiateAgreementValidationSchema),
  AgreementController.initiateAgreement,
);

router.post(
  '/verify-otp',
  auth('AGENT'),
  validateRequest(AgreementValidation.verifyAgreementOtpValidationSchema),
  AgreementController.verifyAgreementOtp,
);

router.post(
  '/resend-otp',
  auth('AGENT'),
  validateRequest(AgreementValidation.resendAgreementOtpValidationSchema),
  AgreementController.resendAgreementOtp,
);

router.post(
  '/sign/:agreementId',
  auth('AGENT'),
  validateRequest(AgreementValidation.signAgreementValidationSchema),
  AgreementController.signAgreement,
);

router.get(
  '/:agreementId',
  auth('AGENT'),
  AgreementController.getAgreementById,
);

router.get('/', auth('AGENT'), AgreementController.getAllAgreements);

export const AgreementRoutes = router;
