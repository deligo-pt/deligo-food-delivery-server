import { z } from 'zod';
import { USER_ROLE, USER_STATUS } from './user.constant';

// Create User Validation Schema
const createUserValidationSchema = z.object({
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
    status: z.nativeEnum(USER_STATUS).default(USER_STATUS.ACTIVE),
    mobileNumber: z.string().optional(),
  }),
});

// Update user personal data validation schema
const updateUserPersonalDataValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    mobileNumber: z.string().optional(),
    profilePhoto: z.string().optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        zipcode: z.string().optional(),
      })
      .optional(),
  }),
});

// Activate or Block User Validation Schema
const activateOrBlockUserValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(USER_STATUS),
  }),
});

// Verify OTP Validation Schema
const verifyOtpValidationSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'Email is required',
    }),
    otp: z.string({
      required_error: 'OTP is required',
    }),
  }),
});

// Resend OTP Validation Schema
const resendOtpValidationSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'Email is required',
    }),
  }),
});

const updateUserValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    role: z.nativeEnum(USER_ROLE).optional(),
    email: z.string().email().optional(),
    password: z.string().optional(),
    status: z.nativeEnum(USER_STATUS).optional(),
    mobileNumber: z.string().optional(),
  }),
});

export const UserValidation = {
  createUserValidationSchema,
  updateUserPersonalDataValidationSchema,
  activateOrBlockUserValidationSchema,
  verifyOtpValidationSchema,
  resendOtpValidationSchema,
  updateUserValidationSchema,
};
