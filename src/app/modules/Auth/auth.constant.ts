/* eslint-disable @typescript-eslint/no-explicit-any */

import { USER_STATUS } from '../../constant/user.const';
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
  '/create-vendor': { Model: Vendor, idField: 'vendorId' },
  '/create-fleet-manager': { Model: FleetManager, idField: 'fleetManagerId' },
  '/create-customer': { Model: Customer, idField: 'customerId' },
  '/create-admin': { Model: Admin, idField: 'adminId' },
  '/create-delivery-partner': {
    Model: DeliveryPartner,
    idField: 'deliveryPartnerId',
  },
} as const;

export type TApprovedRejectsPayload = {
  status: keyof typeof USER_STATUS;
  approvedBy?: string;
  rejectedBy?: string;
  remarks?: string;
};
