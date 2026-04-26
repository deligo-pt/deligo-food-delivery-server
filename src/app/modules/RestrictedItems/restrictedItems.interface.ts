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
  createdAt: string;
  updatedAt: string;
};
