import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { TRestrictedItem } from './restrictedItems.interface';
import { RestrictedItem } from './restrictedItems.model';

// Create Restricted Item Service
const createRestrictedItem = async (payload: TRestrictedItem) => {
  const isExist = await RestrictedItem.findOne({ name: payload.name });
  if (isExist) {
    throw new Error('This item is already in the restricted list!');
  }

  const result = await RestrictedItem.create(payload);
  return {
    message: 'Item added to restricted list successfully',
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
    throw new Error('Restricted item not found!');
  }

  return {
    message: 'Item updated successfully',
    data: result,
  };
};

const getAllRestrictedItems = async (query: Record<string, unknown>) => {
  const items = new QueryBuilder(RestrictedItem.find(), query);

  if (!items) {
    throw new AppError(httpStatus.NOT_FOUND, 'Restricted items not found');
  }

  const meta = await items.countTotal();
  const data = await items.modelQuery;

  return {
    message: 'Items retrieved successfully',
    meta,
    data,
  };
};

const getSingleRestrictedItem = async (itemId: string) => {
  const result = await RestrictedItem.findById(itemId);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Restricted item not found');
  }
  return {
    message: 'Item retrieved successfully',
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
    throw new AppError(httpStatus.NOT_FOUND, 'Restricted item not found');
  }
  return {
    message: 'Item deleted successfully',
    data: result,
  };
};

const permanentDeleteRestrictedItem = async (itemId: string) => {
  const result = await RestrictedItem.findByIdAndDelete({
    _id: itemId,
    isDeleted: true,
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Restricted item not found');
  }
  return {
    message: 'Item permanently deleted successfully',
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
