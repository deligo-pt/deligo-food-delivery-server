/* eslint-disable @typescript-eslint/no-explicit-any */

import { IAuthLookupModel } from '../../interfaces/user.interface';
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
] as IAuthLookupModel<any>[];

export const USER_MODEL_MAP = {
  '/create-vendor': { Model: Vendor, idField: 'userCustomId' },
  '/create-sub-vendor': { Model: Vendor, idField: 'userCustomId' },
  '/create-fleet-manager': { Model: FleetManager, idField: 'userCustomId' },
  '/create-customer': { Model: Customer, idField: 'userCustomId' },
  '/create-admin': { Model: Admin, idField: 'userCustomId' },
  '/create-delivery-partner': {
    Model: DeliveryPartner,
    idField: 'userCustomId',
  },
} as const;

export type TApprovedRejectsPayload = {
  status: 'APPROVED' | 'REJECTED' | 'BLOCKED';
  approvedBy?: string;
  rejectedBy?: string;
  remarks?: string;
};
