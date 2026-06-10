import { z } from 'zod';
import {
  USER_ROLE,
  USER_STATUS,
} from '../../constant/GlobalConstant/user.constant';
// Register
const registerValidationSchema = z.object({
  body: z
    .object({
      email: z
        .string({
          required_error: 'Email is required',
        })
        .email({
          message: 'Invalid email',
        }),
      role: z.enum(['VENDOR', 'DELIVERY_PARTNER', 'FLEET_MANAGER'], {
        errorMap: (issue, ctx) => {
          if (issue.code === z.ZodIssueCode.invalid_enum_value) {
            return {
              message:
                'Invalid registration role. Only VENDOR, DELIVERY_PARTNER, or FLEET_MANAGER are allowed.',
            };
          }
          return { message: ctx.defaultError };
        },
      }),
      password: z.string({
        required_error: 'Password is required',
      }),
    })
    .strict(),
});
// Login
const loginValidationSchema = z.object({
  body: z
    .object({
      email: z.string({
        required_error: 'Email is required',
      }),
      password: z.string({ required_error: 'Password is required' }),
      deviceDetails: z.object({
        deviceId: z.string({
          required_error: 'Device ID is required',
        }),
        deviceType: z.string({
          required_error: 'Device Type is required',
        }),
        deviceName: z.string({
          required_error: 'Device Name is required',
        }),
        fcmToken: z
          .string({
            required_error: 'FCM Token is required',
          })
          .optional(),
        userAgent: z.string().optional(),
        isLoggedIn: z.boolean().optional(),
      }),
      forceLogin: z.boolean().optional(),
    })
    .strict(),
});

// login customer
const loginCustomerValidationSchema = z.object({
  body: z
    .object({
      email: z.string().email('Invalid email format').optional(),
      contactNumber: z.string().optional(),
      referralCode: z.string().optional(),
    })
    .strict()
    .refine((data) => data.email || data.contactNumber, {
      message: 'Either Email or Contact Number is required',
      path: ['email'],
    }),
});
const logoutValidationSchema = z.object({
  body: z
    .object({
      deviceId: z.string({
        required_error: 'Device ID is required',
      }),
    })
    .strict(),
});

// Change Password
const changePasswordValidationSchema = z.object({
  body: z
    .object({
      oldPassword: z.string({
        required_error: 'Old password is required',
      }),
      newPassword: z.string({ required_error: 'Password is required' }),
    })
    .strict(),
});
// Forgot Password
const forgotPasswordValidationSchema = z.object({
  body: z
    .object({
      email: z.string({
        required_error: 'Email is required',
      }),
    })
    .strict(),
});

// reset Password
const resetPasswordValidationSchema = z.object({
  body: z
    .object({
      email: z.string({
        required_error: 'Email is required',
      }),
      token: z.string({
        required_error: 'Token is required',
      }),
      newPassword: z.string({ required_error: 'Password is required' }),
    })
    .strict(),
});

// Refresh Token
const refreshTokenValidationSchema = z.object({
  cookies: z
    .object({
      refreshToken: z.string({
        required_error: 'Refresh token is required!',
      }),
    })
    .strict(),
});

// Approve or Reject User Validation Schema
const approvedOrRejectedUserValidationSchema = z.object({
  body: z
    .object({
      status: z.enum([
        USER_STATUS.APPROVED,
        USER_STATUS.REJECTED,
        USER_STATUS.BLOCKED,
      ]),
      approvedBy: z.string().optional(),
      rejectedBy: z.string().optional(),
      remarks: z.string().optional(),
    })
    .strict(),
});

// Verify OTP Validation Schema
const verifyOtpValidationSchema = z.object({
  body: z
    .object({
      email: z
        .string({
          required_error: 'Email is required',
        })
        .email('Invalid email format')
        .optional(),
      contactNumber: z
        .string({
          required_error: 'Mobile number is required',
        })
        .optional(),
      role: z.nativeEnum(USER_ROLE, {
        required_error: 'Role is required',
        invalid_type_error: 'Invalid user role provided',
      }),
      otp: z.string({
        required_error: 'OTP is required',
      }),
      deviceDetails: z
        .object({
          deviceId: z.string({
            required_error: 'Device ID is required',
          }),
          deviceType: z.string({
            required_error: 'Device Type is required',
          }),
          deviceName: z.string().optional(),
          fcmToken: z.string().optional(),
          userAgent: z.string().optional(),
          isLoggedIn: z.boolean().optional(),
        })
        .optional(),
      forceLogin: z.boolean().optional(),
    })
    .strict()
    .refine((data) => data.email || data.contactNumber, {
      message: 'Either Email or Contact Number is required',
      path: ['email'],
    }),
});

// Resend OTP Validation Schema
const resendOtpValidationSchema = z.object({
  body: z
    .object({
      role: z.nativeEnum(USER_ROLE, {
        required_error: 'Role is required',
        invalid_type_error: 'Invalid user role provided',
      }),
      email: z.string().optional(),
      contactNumber: z.string().optional(),
    })
    .strict()
    .refine((data) => data.email || data.contactNumber, {
      message: 'Either Email or Contact Number is required',
      path: ['email'],
    }),
});

export const AuthValidation = {
  registerValidationSchema,
  loginValidationSchema,
  loginCustomerValidationSchema,
  logoutValidationSchema,
  changePasswordValidationSchema,
  forgotPasswordValidationSchema,
  resetPasswordValidationSchema,
  refreshTokenValidationSchema,
  approvedOrRejectedUserValidationSchema,
  verifyOtpValidationSchema,
  resendOtpValidationSchema,
};
