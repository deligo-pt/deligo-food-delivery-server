import { Model, Types } from 'mongoose';
import { TPermissionAction } from './permission.constant';

export interface TPermission {
  _id?: Types.ObjectId;
  name: string;
  action: TPermissionAction;
  module: string;
  description?: string;
  isSystemDefined?: boolean;

  displayName?: string;
  isActive?: boolean;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted?: boolean;
}

export type PermissionModel = Model<TPermission, Record<string, never>>;
