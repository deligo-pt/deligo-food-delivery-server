export const PermissionActions = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'MANAGE',
] as const;

export const PERMISSION_SUBJECTS = [
  'DELIVERY_PARTNER',
  'VENDOR',
  'SUB_VENDOR',
  'CUSTOMER',
  'ADMIN',
  'FLEET_MANAGER',
  'ORDER',
  'COUPON',
  'CHAT_SYSTEM',
  'AGREEMENT',
  'PERMISSION',
] as const;

export const SYSTEM_PERMISSIONS = {
  // =====================================================================
  // Delivery Partner (Rider) Management Module
  // =====================================================================
  VIEW_DELIVERY_PARTNERS: 'VIEW_DELIVERY_PARTNERS', // (From READ + DELIVERY_PARTNER)
  CREATE_DELIVERY_PARTNER: 'CREATE_DELIVERY_PARTNER', // (From CREATE + DELIVERY_PARTNER)
  UPDATE_DELIVERY_PARTNER: 'UPDATE_DELIVERY_PARTNER', // (From UPDATE + DELIVERY_PARTNER)
  DELETE_DELIVERY_PARTNER: 'DELETE_DELIVERY_PARTNER', // (From DELETE + DELIVERY_PARTNER)
  MANAGE_DELIVERY_PARTNER: 'MANAGE_DELIVERY_PARTNER', // (From MANAGE + DELIVERY_PARTNER)

  // =====================================================================
  // Vendor & Store Management Module
  // =====================================================================
  VIEW_VENDORS: 'VIEW_VENDORS', // (From READ + VENDOR)
  CREATE_VENDOR: 'CREATE_VENDOR', // (From CREATE + VENDOR)
  UPDATE_VENDOR: 'UPDATE_VENDOR', // (From UPDATE + VENDOR)
  DELETE_VENDOR: 'DELETE_VENDOR', // (From DELETE + VENDOR)
  MANAGE_VENDOR: 'MANAGE_VENDOR',

  // =====================================================================
  // Order & Logistics Module
  // =====================================================================
  VIEW_ORDERS: 'VIEW_ORDERS', // (From READ + ORDER)
  CREATE_ORDER: 'CREATE_ORDER', // (From CREATE + ORDER)
  UPDATE_ORDER: 'UPDATE_ORDER', // (From UPDATE + ORDER)
  DELETE_ORDER: 'DELETE_ORDER', // (From DELETE + ORDER)
  MANAGE_ORDER: 'MANAGE_ORDER', // Changed from MANAGE_ORDERS to match your backend rule

  // =====================================================================
  // Coupon Module
  // =====================================================================
  VIEW_COUPONS: 'VIEW_COUPONS', // (From READ + COUPON)
  CREATE_COUPON: 'CREATE_COUPON', // (From CREATE + COUPON)
  UPDATE_COUPON: 'UPDATE_COUPON', // (From UPDATE + COUPON)
  DELETE_COUPON: 'DELETE_COUPON', // (From DELETE + COUPON)
  MANAGE_COUPON: 'MANAGE_COUPON',

  // =====================================================================
  // Permission Management Module
  // =====================================================================
  VIEW_PERMISSIONS: 'VIEW_PERMISSIONS', // (From READ + PERMISSION)
  CREATE_PERMISSION: 'CREATE_PERMISSION', // (From CREATE + PERMISSION)
  UPDATE_PERMISSION: 'UPDATE_PERMISSION', // (From UPDATE + PERMISSION)
  DELETE_PERMISSION: 'DELETE_PERMISSION', // (From DELETE + PERMISSION)
  MANAGE_PERMISSION: 'MANAGE_PERMISSION',

  // =====================================================================
  // Chat Support System Module
  // =====================================================================
  VIEW_CHAT_SYSTEMS: 'VIEW_CHAT_SYSTEMS', // (From READ + CHAT_SYSTEM)
  CREATE_CHAT_SYSTEM: 'CREATE_CHAT_SYSTEM', // (From CREATE + CHAT_SYSTEM)
  UPDATE_CHAT_SYSTEM: 'UPDATE_CHAT_SYSTEM', // (From UPDATE + CHAT_SYSTEM)
  DELETE_CHAT_SYSTEM: 'DELETE_CHAT_SYSTEM', // (From DELETE + CHAT_SYSTEM)
  MANAGE_CHAT_SYSTEM: 'MANAGE_CHAT_SYSTEM', // (From MANAGE + CHAT_SYSTEM)

  // =====================================================================
  // Legal Agreement Module
  // =====================================================================
  VIEW_AGREEMENTS: 'VIEW_AGREEMENTS', // (From READ + AGREEMENT)
  CREATE_AGREEMENT: 'CREATE_AGREEMENT', // (From CREATE + AGREEMENT)
  UPDATE_AGREEMENT: 'UPDATE_AGREEMENT', // (From UPDATE + AGREEMENT)
  DELETE_AGREEMENT: 'DELETE_AGREEMENT', // (From DELETE + AGREEMENT)
  MANAGE_AGREEMENT: 'MANAGE_AGREEMENT', // (From MANAGE + AGREEMENT)

  // =====================================================================
  // Customer & Staff Management Tiers
  // =====================================================================
  VIEW_CUSTOMERS: 'VIEW_CUSTOMERS', // (From READ + CUSTOMER)
  UPDATE_CUSTOMER: 'UPDATE_CUSTOMER', // (From UPDATE + CUSTOMER)
  VIEW_ADMINS: 'VIEW_ADMINS', // (From READ + ADMIN)
  UPDATE_ADMIN: 'UPDATE_ADMIN', // (From UPDATE + ADMIN)
} as const;
