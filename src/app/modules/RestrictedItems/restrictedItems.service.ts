import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { TRestrictedItem } from './restrictedItems.interface';
import { RestrictedItem } from './restrictedItems.model';

// Create Restricted Item Service
const createRestrictedItem = async (payload: TRestrictedItem) => {
  const isExist = await RestrictedItem.findOne({ name: payload.name });
  if (isExist) {
    throw new AppError(httpStatus.CONFLICT, 'ITEM_ALREADY_RESTRICTED');
  }

  const result = await RestrictedItem.create(payload);
  return {
    messageKey: 'ITEM_ADDED_TO_RESTRICTED_LIST_SUCCESS',
    data: result,
  };
};

const updateRestrictedItem = async (
  itemId: string,
  payload: Partial<TRestrictedItem>,
) => {
  const result = await RestrictedItem.findByIdAndUpdate(itemId, payload, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'RESTRICTED_ITEM_NOT_FOUND');
  }

  return {
    messageKey: 'ITEM_UPDATED_SUCCESS',
    data: result,
  };
};

const getAllRestrictedItems = async (query: Record<string, unknown>) => {
  const items = new QueryBuilder(RestrictedItem.find(), query);

  if (!items) {
    throw new AppError(httpStatus.NOT_FOUND, 'RESTRICTED_ITEMS_NOT_FOUND');
  }

  const meta = await items.countTotal();
  const data = await items.modelQuery;

  return {
    messageKey: 'ITEMS_RETRIEVED_SUCCESS',
    meta,
    data,
  };
};

const getSingleRestrictedItem = async (itemId: string) => {
  const result = await RestrictedItem.findById(itemId);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'RESTRICTED_ITEM_NOT_FOUND');
  }
  return {
    messageKey: 'ITEM_RETRIEVED_SUCCESS',
    data: result,
  };
};

const softDeleteRestrictedItem = async (itemId: string) => {
  const result = await RestrictedItem.findByIdAndUpdate(
    {
      _id: itemId,
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'RESTRICTED_ITEM_NOT_FOUND');
  }
  return {
    messageKey: 'ITEM_DELETED_SUCCESS',
    data: result,
  };
};

const permanentDeleteRestrictedItem = async (itemId: string) => {
  const result = await RestrictedItem.findByIdAndDelete({
    _id: itemId,
    isDeleted: true,
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'RESTRICTED_ITEM_NOT_FOUND');
  }
  return {
    messageKey: 'ITEM_PERMANENTLY_DELETED_SUCCESS',
    data: result,
  };
};

export const RestrictedItemService = {
  createRestrictedItem,
  updateRestrictedItem,
  getAllRestrictedItems,
  getSingleRestrictedItem,
  softDeleteRestrictedItem,
  permanentDeleteRestrictedItem,
};
