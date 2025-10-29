import express from 'express';
import { UserControllers } from './user.controller';
// import auth from '../../middlewares/auth';
// import { USER_ROLE } from './user.constant';
import validateRequest from '../../middlewares/validateRequest';
import { UserValidation } from './user.validation';

const router = express.Router();

export const UserRoutes = router;

// Customer Registration Route
router.post(
  '/create-customer',
  // auth(USER_ROLE.ADMIN),
  validateRequest(UserValidation.createUserValidationSchema),
  UserControllers.customerRegister
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
