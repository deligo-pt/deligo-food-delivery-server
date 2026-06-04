import { Schema, model } from 'mongoose';
import { TPermission } from './permission.interface';

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
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isSystemDefined: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'AuthUser',
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
