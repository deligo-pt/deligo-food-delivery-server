export const PermissionActions = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
] as const;

export const PERMISSION_SUBJECTS = [
  'DeliveryPartner',
  'Vendor',
  'Order',
  'Coupon',
  'Admin',
  'Customer',
] as const;

export const SYSTEM_PERMISSIONS = {
  // Delivery Partner (Rider) Management Module
  VIEW_DELIVERY_PARTNERS: 'VIEW_DELIVERY_PARTNERS',
  UPDATE_DELIVERY_PARTNER: 'UPDATE_DELIVERY_PARTNER',
  UPLOAD_RIDER_DOCUMENTS: 'UPLOAD_RIDER_DOCUMENTS',
  APPROVE_RIDER_STATUS: 'APPROVE_RIDER_STATUS',

  // Vendor & Store Management Module
  MANAGE_VENDORS: 'MANAGE_VENDORS',

  // Order & Logistics Module
  MANAGE_ORDERS: 'MANAGE_ORDERS',

  // Coupon Module
  MANAGE_COUPONS: 'MANAGE_COUPONS',
} as const;
