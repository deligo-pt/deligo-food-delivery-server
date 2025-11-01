import express from 'express';
import { UserControllers } from './user.controller';
import validateRequest from '../../middlewares/validateRequest';
import { UserValidation } from './user.validation';
import { UrlPath } from './user.constant';
import auth from '../../middlewares/auth';

const router = express.Router();

export const UserRoutes = router;

// User Registration Route
router.post(
  [UrlPath.CUSTOMER, UrlPath.AGENT, UrlPath.VENDOR, UrlPath.ADMIN],
  validateRequest(UserValidation.createUserValidationSchema),
  UserControllers.userRegister
);

// User Update Route
router.patch(
  '/:id',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'AGENT',
    'VENDOR',
    'DELIVERY_PARTNER'
  ),
  validateRequest(UserValidation.updateUserPersonalDataValidationSchema),
  UserControllers.updateUser
);

// Active or Block User Route
router.patch(
  '/:id/activate-block-user',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(UserValidation.activateOrBlockUserValidationSchema),
  UserControllers.activateOrBlockUser
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

router.get('/', auth('ADMIN', 'SUPER_ADMIN'), UserControllers.getAllUsers);
router.get('/:id', auth('ADMIN', 'SUPER_ADMIN'), UserControllers.getSingleUser);
