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
  productCategory?: string;
  id?: string;
  resolvedBy?: string;
  reviewerId?: string;
  targetId?: string;
  orderId?: string;

  userObjectId?: boolean | PopulateOptions[];
};

export const getPopulateOptions = (
  role: UserRole,
  fields: PopulateInput,
): PopulateOptions[] => {
  const options: PopulateOptions[] = [];
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);

  const addOption = (
    field: keyof PopulateInput,
    path: string,
    condition = true,
  ) => {
    if (fields[field] && condition) {
      options.push({
        path,
        select: fields[field]!,
      });
    }
  };
  addOption('customer', 'customerId', role !== 'CUSTOMER');
  addOption('vendor', 'vendorId', isAdmin || role === 'CUSTOMER');
  addOption('itemVendor', 'items.vendorId', isAdmin || role === 'CUSTOMER');
  addOption('deliveryPartner', 'deliveryPartnerId');
  addOption('fleetManager', 'fleetManagerId', isAdmin);
  addOption('admin', 'adminId', isAdmin);
  addOption('superAdmin', 'superAdminId', role === 'SUPER_ADMIN');

  // Admin only fields
  ['approvedBy', 'rejectedBy', 'blockedBy', 'resolvedBy'].forEach((key) => {
    addOption(key as keyof PopulateInput, key, isAdmin && !fields.userObjectId);
  });

  addOption('id', 'userObjectId.id');
  addOption('product', 'items.productId');
  addOption('productCategory', 'category');
  addOption('orderId', 'orderId');
  addOption(
    'reviewerId',
    'reviewerId',
    isAdmin || ['VENDOR', 'SUB_VENDOR', 'FLEET_MANAGER'].includes(role),
  );

  addOption(
    'targetId',
    'targetId',
    isAdmin || ['VENDOR', 'SUB_VENDOR', 'FLEET_MANAGER'].includes(role),
  );

  if (fields.userObjectId) {
    const subPopulateOptions: PopulateOptions[] = [];

    if (isAdmin && fields.approvedBy)
      subPopulateOptions.push({
        path: 'approvedBy',
        select: fields.approvedBy,
      });
    if (isAdmin && fields.rejectedBy)
      subPopulateOptions.push({
        path: 'rejectedBy',
        select: fields.rejectedBy,
      });
    if (isAdmin && fields.blockedBy)
      subPopulateOptions.push({ path: 'blockedBy', select: fields.blockedBy });

    options.push({
      path: 'userObjectId',
      populate: subPopulateOptions.length ? subPopulateOptions : undefined, // সাব-পপুলেট থাকলে চেইন করবে
    });
  }
  return options;
};
