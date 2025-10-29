import express from 'express';
import { UserControllers } from './user.controller';
import validateRequest from '../../middlewares/validateRequest';
import { UserValidation } from './user.validation';
import { UrlPath } from './user.constant';

const router = express.Router();

export const UserRoutes = router;

// User Registration Route
router.post(
  [UrlPath.CUSTOMER, UrlPath.AGENT, UrlPath.VENDOR, UrlPath.DELIVERY_PARTNER],
  validateRequest(UserValidation.createUserValidationSchema),
  UserControllers.userRegister
);

// Verify OTP Route
router.post(
  '/verify-otp',
  validateRequest(UserValidation.verifyOtpValidationSchema),
  UserControllers.verifyOtp
);

// Resend OTP Route
router.post(
  '/resend-otp',
  validateRequest(UserValidation.resendOtpValidationSchema),
  UserControllers.resendOtp
);

router.get('/', UserControllers.getAllUsers);
router.get('/:id', UserControllers.getSingleUser);
