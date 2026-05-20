import { Schema, model } from 'mongoose';
import { TAuthUser } from './authUser.interface';

const authUserSchema = new Schema<TAuthUser>(
  {
    authUserId: {
      type: String,
      required: [true, 'Auth User ID (UUID) is required'],
      unique: true,
      trim: true,
    },
    userObjectId: {
      type: Schema.Types.ObjectId,
      required: [true, 'User Object ID reference is required'],
    },
    customUserId: {
      type: String,
      required: [true, 'Custom User ID is required'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      default: 'PENDING',
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
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
