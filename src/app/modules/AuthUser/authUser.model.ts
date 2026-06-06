import { model, Schema } from 'mongoose';
import { TAuthUser } from './authUser.interface';

const authUserSchema = new Schema<TAuthUser>(
  {
    userId: {
      type: String,
      required: [true, 'Custom User ID is required'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: false, // Optional because of TCustomer support
      unique: true,
      sparse: true, // CRITICAL: Allows multiple documents to have 'null/undefined' email without unique conflict
      lowercase: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // CRITICAL: Allows documents without phone numbers without unique conflict
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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const AuthUser = model<TAuthUser>('AuthUser', authUserSchema);
