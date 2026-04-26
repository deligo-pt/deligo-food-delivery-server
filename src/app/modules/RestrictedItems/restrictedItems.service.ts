import { TRestrictedItem } from './restrictedItems.interface';
import { RestrictedItem } from './restrictedItems.model';

const createRestrictedItem = async (payload: TRestrictedItem) => {
  const isExist = await RestrictedItem.findOne({ name: payload.name });
  if (isExist) {
    throw new Error('This item is already in the restricted list!');
  }

  const result = await RestrictedItem.create(payload);
  return result;
};

export const RestrictedItemService = {
  createRestrictedItem,
};
