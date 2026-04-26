export type TRestrictedItem = {
  _id: string;
  name: string;
  reason: string;
  category:
    | 'TOBACCO'
    | 'ALCOHOL'
    | 'ADULT_CONTENT'
    | 'DANGEROUS_GOODS'
    | 'OTHER';
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};
