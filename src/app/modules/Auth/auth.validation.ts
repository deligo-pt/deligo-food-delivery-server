import { z } from 'zod';
import { USER_STATUS } from '../../constant/user.constant';
// Register
const registerValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email({
        message: 'Invalid email',
      }),
    password: z.string({
      required_error: 'Password is required',
    }),
  }),
});
// Login
const loginValidationSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'Email is required',
    }),
    password: z.string({ required_error: 'Password is required' }),
    deviceDetails: z
      .object({
        deviceId: z.string({
          required_error: 'Device ID is required',
        }),
        deviceType: z.string({
          required_error: 'Device Type is required',
        }),
        deviceName: z.string({
          required_error: 'Device Name is required',
        }),
        fcmToken: z.string({
          required_error: 'FCM Token is required',
        }),
        userAgent: z
          .string({
            required_error: 'User Agent is required',
          })
          .optional(),
        isLoggedIn: z.boolean({
          required_error: 'isLoggedIn is required',
        }),
      })
      .required(),
    forceLogin: z.boolean().optional(),
  }),
});

// login customer
const loginCustomerValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .optional(),
    contactNumber: z
      .string({
        required_error: 'Mobile number is required',
      })
      .optional(),
    referralCode: z.string().optional(),
  }),
});
const logoutValidationSchema = z.object({
  body: z.object({
    deviceId: z.string({
      required_error: 'Device ID is required',
    }),
  }),
});

// Change Password
const changePasswordValidationSchema = z.object({
  body: z.object({
    oldPassword: z.string({
      required_error: 'Old password is required',
    }),
    newPassword: z.string({ required_error: 'Password is required' }),
  }),
});
// Forgot Password
const forgotPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'Email is required',
    }),
  }),
});

// reset Password
const resetPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'Email is required',
    }),
    token: z.string({
      required_error: 'Token is required',
    }),
    newPassword: z.string({ required_error: 'Password is required' }),
  }),
});

// Refresh Token
const refreshTokenValidationSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({
      required_error: 'Refresh token is required!',
    }),
  }),
});

// Approve or Reject User Validation Schema
const approvedOrRejectedUserValidationSchema = z.object({
  body: z.object({
    status: z.enum([
      USER_STATUS.APPROVED,
      USER_STATUS.REJECTED,
      USER_STATUS.BLOCKED,
    ]),
    approvedBy: z.string().optional(),
    rejectedBy: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

// Verify OTP Validation Schema
const verifyOtpValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .optional(),
    contactNumber: z
      .string({
        required_error: 'Mobile number is required',
      })
      .optional(),
    otp: z
      .string({
        required_error: 'OTP is required',
      })
      .optional(),
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
  }),
});

// Resend OTP Validation Schema
const resendOtpValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .optional(),
    contactNumber: z
      .string({
        required_error: 'Mobile number is required',
      })
      .optional(),
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
