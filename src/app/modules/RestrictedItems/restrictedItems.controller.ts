import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { RestrictedItemService } from './restrictedItems.service';
import sendResponse from '../../utils/sendResponse';
import { TMessageKey } from '../../errors/messages';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

const createRestrictedItem = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await RestrictedItemService.createRestrictedItem(req.body);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created Restricted Item',
    target: req.body?.name || 'New Restricted Item',
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

const updateRestrictedItem = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const itemId = req.params.itemId;
  const result = await RestrictedItemService.updateRestrictedItem(
    itemId,
    req.body,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Restricted Item',
    target: req.body?.name || `Restricted Item #${itemId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

const getAllRestrictedItems = catchAsync(async (req, res) => {
  const result = await RestrictedItemService.getAllRestrictedItems(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
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
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

const softDeleteRestrictedItem = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const itemId = req.params.itemId;
  const result = await RestrictedItemService.softDeleteRestrictedItem(itemId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted Restricted Item',
    target: `Restricted Item #${itemId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

const permanentDeleteRestrictedItem = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const itemId = req.params.itemId;
  const result =
    await RestrictedItemService.permanentDeleteRestrictedItem(itemId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Permanently Deleted Restricted Item',
    target: `Restricted Item #${itemId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

export const RestrictedItemsController = {
  createRestrictedItem,
  updateRestrictedItem,
  getAllRestrictedItems,
  getSingleRestrictedItem,
  softDeleteRestrictedItem,
  permanentDeleteRestrictedItem,
};
