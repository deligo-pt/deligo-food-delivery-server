export type TPermission = {
  name: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  subject: string;
  description?: string;
};
