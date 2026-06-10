import { UrlPath } from '../../constant/GlobalConstant/user.constant';
import auth from '../../middlewares/auth';
import { rateLimiter } from '../../middlewares/rateLimiter';
import validateRequest, {
  validateRequestCookies,
} from '../../middlewares/validateRequest';
import { AuthControllers } from './auth.controller';
import { AuthValidation } from './auth.validation';
import { Router } from 'express';

const router = Router();
// Register User Route [Vendor, Fleet Manager, Admin,Delivery Partner]
router.post(
  '/register',
  validateRequest(AuthValidation.registerValidationSchema),
  rateLimiter('auth'),
  AuthControllers.registerUser,
);
// Register User Route (Registered by Fleet Manager[Delivery Partner], Admin, Super Admin,Vendor[Sub Vendor])
router.post(
  '/register/onboard',
  auth('ADMIN', 'FLEET_MANAGER', 'SUPER_ADMIN', 'VENDOR'),
  validateRequest(AuthValidation.registerOnboardingValidationSchema),
  rateLimiter('auth'),
  AuthControllers.onboardUser,
);

// Verify OTP Route
router.post(
  '/verify-otp',
  validateRequest(AuthValidation.verifyOtpValidationSchema),
  AuthControllers.verifyOtp,
);

// Resend OTP Route
router.post(
  '/resend-otp',
  validateRequest(AuthValidation.resendOtpValidationSchema),
  AuthControllers.resendOtp,
);

// Login User Route
router.post(
  '/login',
  validateRequest(AuthValidation.loginValidationSchema),
  rateLimiter('auth'),
  AuthControllers.loginUser,
);

// login customer
router.post(
  '/login-customer',
  validateRequest(AuthValidation.loginCustomerValidationSchema),
  rateLimiter('auth'),
  AuthControllers.loginCustomer,
);

// Update FCM Token Route
router.post(
  '/update-fcm-token',
  auth(
    'ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'SUB_VENDOR',
    'FLEET_MANAGER',
    'SUPER_ADMIN',
  ),
  AuthControllers.updateFcmToken,
);

// Logout User Route
router.post(
  '/logout',
  auth(
    'ADMIN',
    'CUSTOMER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'SUB_VENDOR',
    'FLEET_MANAGER',
    'SUPER_ADMIN',
  ),
  validateRequest(AuthValidation.logoutValidationSchema),
  rateLimiter('auth'),
  AuthControllers.logoutUser,
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
    'SUB_VENDOR',
    'FLEET_MANAGER',
  ),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  rateLimiter('auth'),
  AuthControllers.changePassword,
);

//forgot password
router.post(
  '/forgot-password',
  validateRequest(AuthValidation.forgotPasswordValidationSchema),
  rateLimiter('auth'),
  AuthControllers.forgotPassword,
);

// reset password
router.post(
  '/reset-password',
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  rateLimiter('auth'),
  AuthControllers.resetPassword,
);

// refresh token
router.post(
  '/refresh-token',
  validateRequestCookies(AuthValidation.refreshTokenValidationSchema),
  rateLimiter('auth'),
  AuthControllers.refreshToken,
);

// submit approval request Route
router.patch(
  '/:userId/submitForApproval',
  auth('VENDOR', 'DELIVERY_PARTNER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN'),
  AuthControllers.submitForApproval,
);

// Approved or Rejected User Route
router.patch(
  '/:userId/approved-rejected-user',
  auth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(AuthValidation.approvedOrRejectedUserValidationSchema),
  AuthControllers.approvedOrRejectedUser,
);

// soft Delete User Route
router.delete(
  '/soft-delete/:userId',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
    'VENDOR',
    'SUB_VENDOR',
    'CUSTOMER',
  ),
  AuthControllers.softDeleteUser,
);

// permanent Delete User Route
router.delete(
  '/permanent-delete/:userId',
  auth('ADMIN', 'SUPER_ADMIN'),
  AuthControllers.permanentDeleteUser,
);

export const AuthRoutes = router;
