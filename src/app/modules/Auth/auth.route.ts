import { UrlPath } from '../../constant/user.const';
import auth from '../../middlewares/auth';
import validateRequest, {
  validateRequestCookies,
} from '../../middlewares/validateRequest';
import { AuthControllers } from './auth.controller';
import { AuthValidation } from './auth.validation';
import { Router } from 'express';

const router = Router();
// Register User Route
router.post(
  [UrlPath.CUSTOMER, UrlPath.VENDOR, UrlPath.FLEET_MANAGER, UrlPath.ADMIN],
  validateRequest(AuthValidation.registerValidationSchema),
  AuthControllers.registerUser
);
// Register Delivery Partner Route
router.post(
  [UrlPath.DELIVERY_PARTNER],
  auth('ADMIN', 'FLEET_MANAGER', 'SUPER_ADMIN'),
  validateRequest(AuthValidation.registerValidationSchema),
  AuthControllers.registerUser
);
// Login User Route
router.post(
  '/login',
  validateRequest(AuthValidation.loginValidationSchema),
  AuthControllers.loginUser
);

// Save FCM Token Route
router.post(
  '/save-fcm-token',
  auth(
    'ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'FLEET_MANAGER',
    'SUPER_ADMIN'
  ),
  AuthControllers.saveFcmToken
);

// Logout User Route
router.post(
  '/logout',
  auth(
    'ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'FLEET_MANAGER',
    'SUPER_ADMIN'
  ),
  AuthControllers.logoutUser
);
// Change Password
router.post(
  '/change-password',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'FLEET_MANAGER'
  ),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthControllers.changePassword
);

//forgot password
router.post(
  '/forgot-password',
  validateRequest(AuthValidation.forgotPasswordValidationSchema),
  AuthControllers.forgotPassword
);

// reset password
router.post(
  '/reset-password',
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthControllers.resetPassword
);

// refresh token
router.post(
  '/refresh-token',
  validateRequestCookies(AuthValidation.refreshTokenValidationSchema),
  AuthControllers.refreshToken
);

// submit approval request Route
router.patch(
  '/:userId/submitForApproval',
  auth('VENDOR', 'DELIVERY_PARTNER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN'),
  AuthControllers.submitForApproval
);

// Approved or Rejected User Route
router.patch(
  '/:userId/approved-rejected-user',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(AuthValidation.approvedOrRejectedUserValidationSchema),
  AuthControllers.approvedOrRejectedUser
);

// Verify OTP Route
router.post(
  '/verify-otp',
  validateRequest(AuthValidation.verifyOtpValidationSchema),
  AuthControllers.verifyOtp
);

// Resend OTP Route
router.post(
  '/resend-otp',
  validateRequest(AuthValidation.resendOtpValidationSchema),
  AuthControllers.resendOtp
);

// soft Delete User Route
router.delete(
  '/soft-delete/:userId',
  auth('ADMIN', 'SUPER_ADMIN'),
  AuthControllers.softDeleteUser
);

// permanent Delete User Route
router.delete(
  '/permanent-delete/:userId',
  auth('ADMIN', 'SUPER_ADMIN'),
  AuthControllers.permanentDeleteUser
);

export const AuthRoutes = router;
