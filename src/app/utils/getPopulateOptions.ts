import { PopulateOptions } from 'mongoose';

type UserRole =
  | 'VENDOR'
  | 'SUB_VENDOR'
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
  itemVendor?: string;
  product?: string;
  id?: string;
  resolvedBy?: string;
  reviewerId?: string;
  targetId?: string;
};

export const getPopulateOptions = (
  role: UserRole,
  fields: PopulateInput
): PopulateOptions[] => {
  const options: PopulateOptions[] = [];

  // ---------------- Customer ----------------
  if (fields.customer) {
    options.push({
      path: 'customerId',
      select: fields.customer,
    });
  }

  // ---------------- Vendor ----------------
  if (
    fields.vendor &&
    (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'CUSTOMER')
  ) {
    options.push({
      path: 'vendorId',
      select: fields.vendor,
    });
  }

  if (fields.itemVendor) {
    options.push({
      path: 'items.vendorId',
      select: fields.itemVendor,
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

  // ---------------- Product ----------------
  if (fields.product) {
    options.push({
      path: 'items.productId',
      select: fields.product,
    });
  }

  // ---------------- ID ----------------
  if (fields.id) {
    options.push({
      path: 'userId.id',
      select: fields.id,
    });
  }

  // ---------------- Resolved By ----------------
  if (fields.resolvedBy && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
    options.push({
      path: 'resolvedBy',
      select: fields.resolvedBy,
    });
  }

  // ---------------- Reviewer Id ----------------
  if (fields.reviewerId) {
    options.push({
      path: 'reviewerId',
      select: fields.reviewerId,
    });
  }

  // ---------------- Target Id ----------------
  if (fields.targetId) {
    options.push({
      path: 'targetId',
      select: fields.targetId,
    });
  }

  return options;
};
