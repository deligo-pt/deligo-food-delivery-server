import { PopulateOptions } from 'mongoose';

type UserRole =
  | 'VENDOR'
  | 'CUSTOMER'
  | 'DELIVERY_PARTNER'
  | 'ADMIN'
  | 'SUPER_ADMIN'
  | 'FLEET_MANAGER';

type PopulateInput = {
  customer?: string;
  vendor?: string;
  deliveryPartner?: string;
  fleetManager?: string;
  admin?: string;
  superAdmin?: string;
  approvedBy?: string;
  rejectedBy?: string;
  blockedBy?: string;
};

export const getPopulateOptions = (
  role: UserRole,
  fields: PopulateInput
): PopulateOptions[] => {
  const options: PopulateOptions[] = [];

  // ---------------- Customer ----------------
  if (fields.customer && role !== 'CUSTOMER') {
    options.push({
      path: 'customerId',
      select: fields.customer,
    });
  }

  // ---------------- Vendor ----------------
  if (fields.vendor && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
    options.push({
      path: 'vendorId',
      select: fields.vendor,
    });
  }

  // ---------------- Delivery Partner ----------------
  if (fields.deliveryPartner && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
    options.push({
      path: 'deliveryPartnerId',
      select: fields.deliveryPartner,
    });
  }

  // ---------------- Fleet Manager ----------------
  if (fields.fleetManager && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
    options.push({
      path: 'fleetManagerId',
      select: fields.fleetManager,
    });
  }

  // ---------------- Admin ----------------
  if (fields.admin && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
    options.push({
      path: 'adminId',
      select: fields.admin,
    });
  }

  // ---------------- Super Admin ----------------
  if (fields.superAdmin && role === 'SUPER_ADMIN') {
    options.push({
      path: 'superAdminId',
      select: fields.superAdmin,
    });
  }

  // ---------------- Approved By ----------------
  if (fields.approvedBy && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
    options.push({
      path: 'approvedBy',
      select: fields.approvedBy,
    });
  }

  // ---------------- Rejected By ----------------
  if (fields.rejectedBy && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
    options.push({
      path: 'rejectedBy',
      select: fields.rejectedBy,
    });
  }

  // ---------------- Blocked By ----------------
  if (fields.blockedBy && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
    options.push({
      path: 'blockedBy',
      select: fields.blockedBy,
    });
  }

  return options;
};
