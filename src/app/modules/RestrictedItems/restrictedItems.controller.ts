import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { RestrictedItemService } from './restrictedItems.service';
import sendResponse from '../../utils/sendResponse';

const createRestrictedItem = catchAsync(async (req, res) => {
  const result = await RestrictedItemService.createRestrictedItem(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item added to restricted list successfully',
    data: result,
  });
});

const updateRestrictedItem = catchAsync(async (req, res) => {
  const result = await RestrictedItemService.updateRestrictedItem(
    req.params.itemId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item updated successfully',
    data: result,
  });
});

const getAllRestrictedItems = catchAsync(async (req, res) => {
  const result = await RestrictedItemService.getAllRestrictedItems(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Items retrieved successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

const getSingleRestrictedItem = catchAsync(async (req, res) => {
  const result = await RestrictedItemService.getSingleRestrictedItem(
    req.params.itemId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item retrieved successfully',
    data: result,
  });
});

export const RestrictedItemsController = {
  createRestrictedItem,
  updateRestrictedItem,
  getAllRestrictedItems,
  getSingleRestrictedItem,
};
