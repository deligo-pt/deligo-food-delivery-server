import { model, Schema } from 'mongoose';
import { TPermission } from './permission.interface';

export const PermissionActions = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
] as const;

const permissionSchema = new Schema<TPermission>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    action: {
      type: String,
      enum: PermissionActions,
      required: true,
    },
    subject: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true },
);

export const Permission = model<TPermission>('Permission', permissionSchema);
