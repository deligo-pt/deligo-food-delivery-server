/* eslint-disable @typescript-eslint/no-explicit-any */

import { IUserModel } from '../../interfaces/user.interface';
import { Admin } from '../Admin/admin.model';
import { Customer } from '../Customer/customer.model';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { FleetManager } from '../Fleet-Manager/fleet-manager.model';
import { Vendor } from '../Vendor/vendor.model';

export const ALL_USER_MODELS = [
  Admin,
  Vendor,
  FleetManager,
  DeliveryPartner,
  Customer,
] as IUserModel<any>[];

export const USER_MODEL_MAP = {
  '/create-vendor': { Model: Vendor, idField: 'userId' },
  '/create-fleet-manager': { Model: FleetManager, idField: 'userId' },
  '/create-customer': { Model: Customer, idField: 'userId' },
  '/create-admin': { Model: Admin, idField: 'userId' },
  '/create-delivery-partner': {
    Model: DeliveryPartner,
    idField: 'userId',
  },
} as const;

export type TApprovedRejectsPayload = {
  status: 'APPROVED' | 'REJECTED' | 'BLOCKED';
  approvedBy?: string;
  rejectedBy?: string;
  remarks?: string;
};
