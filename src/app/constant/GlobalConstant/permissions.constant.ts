import USER_ROLE from '../GlobalConstant/user.constant';

export const ROLE_PERMISSIONS = {
  [USER_ROLE.SUPER_ADMIN]: ['*'],
  [USER_ROLE.VENDOR]: ['edit_menu', 'view_orders', 'manage_sub_vendors'],
  [USER_ROLE.SUB_VENDOR]: ['view_orders', 'update_order_status'],
  [USER_ROLE.CUSTOMER]: ['create_order', 'view_own_orders', 'download_invoice'],
  [USER_ROLE.DELIVERY_PARTNER]: ['accept_delivery', 'update_location'],
};
