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

export const RestrictedItemsController = {
  createRestrictedItem,
};
