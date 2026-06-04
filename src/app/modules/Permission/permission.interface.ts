import { Types } from 'mongoose';

export type TPermissionAction =
  | 'CAN_VIEW_DASHBOARD'
  | 'CAN_MANAGE_ADMINS'
  | 'CAN_MANAGE_VENDORS'
  | 'CAN_MANAGE_PARTNERS'
  | 'CAN_MANAGE_CUSTOMERS'
  | 'CAN_UPDATE_ORDER'
  | 'CAN_DELETE_ADDON'
  | string;

export interface TPermission {
  _id?: Types.ObjectId;
  name: string;
  action: TPermissionAction;
  module: string;
  description?: string;
  isSystemDefined?: boolean;
  createdBy?: Types.ObjectId;
  isDeleted?: boolean;
}
