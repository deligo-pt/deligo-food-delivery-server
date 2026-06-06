import { Schema, model } from 'mongoose';
import { TPermission } from './permission.interface';
import { VALID_PERMISSION_ACTIONS } from './permission.constant';

const permissionSchema = new Schema<TPermission>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      enum: {
        values: VALID_PERMISSION_ACTIONS,
        message: '{VALUE} is not a valid system permission action code!',
      },
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
    },
    isSystemDefined: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
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

export const Permission = model<TPermission>('Permission', permissionSchema);
