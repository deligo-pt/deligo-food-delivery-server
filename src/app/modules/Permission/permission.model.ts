import { model, Schema } from 'mongoose';
import { TPermission } from './permission.interface';
import { PERMISSION_SUBJECTS, PermissionActions } from './permission.constant';

const permissionSchema = new Schema<TPermission>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    action: {
      type: String,
      enum: PermissionActions,
      required: true,
    },
    subject: { type: String, enum: PERMISSION_SUBJECTS, required: true },
    description: { type: String },
  },
  { timestamps: true },
);

export const Permission = model<TPermission>('Permission', permissionSchema);
