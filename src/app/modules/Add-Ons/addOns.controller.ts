import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AddOnsServices } from './addOns.service';
import { AuthUser } from '../../constant/user.constant';

const createAddonGroup = catchAsync(async (req, res) => {
  const result = await AddOnsServices.createAddonGroup(
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Addon group created successfully',
    data: result,
  });
});

const getAllAddonGroups = catchAsync(async (req, res) => {
  const result = await AddOnsServices.getAllAddonGroups(
    req.query,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Addon groups fetched successfully',
    data: result,
  });
});

const updateAddonGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const result = await AddOnsServices.updateAddonGroup(addonGroupId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Addon group updated successfully',
    data: result,
  });
});

const addOptionToGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const result = await AddOnsServices.addOptionToAddonGroup(
    addonGroupId,
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'New option added to group successfully',
    data: result,
  });
});

const deleteOptionFromGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const { optionName } = req.query; // কুয়েরি থেকে অপশন নাম নেওয়া হচ্ছে
  const result = await AddOnsServices.deleteOptionFromAddonGroup(
    addonGroupId,
    optionName as string,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Option removed from group successfully',
    data: result,
  });
});

export const AddOnsControllers = {
  createAddonGroup,
  getAllAddonGroups,
  updateAddonGroup,
  addOptionToGroup,
  deleteOptionFromGroup,
};
