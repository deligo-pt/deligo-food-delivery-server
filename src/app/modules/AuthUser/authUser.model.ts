import { model, Schema } from 'mongoose';
import { TAuthUser } from './authUser.interface';
import {
  IAuthUserMethods,
  IAuthUserModel,
} from '../../interfaces/user.interface';
import { loginDeviceSchema } from '../../constant/GlobalModel/user.model';
import { authLookupPlugin } from '../../plugins/authLookupPlugin';
import { passwordPlugin } from '../../plugins/passwordPlugin';

const authUserSchema = new Schema<TAuthUser, IAuthUserModel, IAuthUserMethods>(
  {
    userId: {
      type: String,
      required: [true, 'Custom User ID is required'],
      unique: true,
      trim: true,
    },
    profileId: {
      type: Schema.Types.ObjectId,
      required: [true, 'User Object ID reference is required'],
      refPath: 'profileModel',
    },
    profileModel: {
      type: String,
      required: [true, 'User Object ID reference is required'],
      enum: ['Customer', 'Vendor', 'FleetManager', 'DeliveryPartner', 'Admin'],
    },
    email: {
      type: String,
      required: false, // Optional because of TCustomer support
      lowercase: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: false,
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },

    // 2. Live Status & Access Control (RBAC)
    status: {
      type: String,
      required: [true, 'Status is required'],
      default: 'PENDING',
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // 3. Real-Time Device Management & Session Tracking
    loginDevices: { type: [loginDeviceSchema], default: [] },

    // 4. OTP & Email Verification Flow
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isContactNumberVerified: {
      type: Boolean,
      default: false,
    },

    requiresOtpVerification: {
      type: Boolean,
      default: false,
    },
    mobileOtpId: {
      type: String,
      default: null,
    },

    // 5. Password Credentials & Security Audit Logs
    password: {
      type: String,
      required: false, // Kept optional as some users might use social/OTP login
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

authUserSchema.index(
  { email: 1, role: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
  },
);

authUserSchema.index(
  { contactNumber: 1, role: 1 },
  {
    unique: true,
    partialFilterExpression: { contactNumber: { $type: 'string' } },
  },
);

authUserSchema.pre('save', function (next) {
  const user = this;

  if (user.isNew && user.profileModel === 'Customer') {
    user.status = 'APPROVED';
  }

  next();
});

authUserSchema.plugin(authLookupPlugin);
authUserSchema.plugin(passwordPlugin);

export const AuthUser = model<TAuthUser, IAuthUserModel>(
  'AuthUser',
  authUserSchema,
);
