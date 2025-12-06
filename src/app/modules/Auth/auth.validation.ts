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
  changePasswordValidationSchema,
  forgotPasswordValidationSchema,
  resetPasswordValidationSchema,
  refreshTokenValidationSchema,
  approvedOrRejectedUserValidationSchema,
  verifyOtpValidationSchema,
  resendOtpValidationSchema,
};
