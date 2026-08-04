import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AddOnsServices } from './addOns.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { formatAddonGroupResponse } from './addOns.utils';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';

// create addon group controller
const createAddonGroup = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const lang = req.lang as TLanguageCode;
  const result = await AddOnsServices.createAddonGroup(req.body, currentUser);

  // Background Activity Log
  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created Addon Group',
    target:
      (lang === 'en' ? result?.data?.title?.en : result?.data?.title?.pt) ||
      'Addon Group',
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// update addon group controller
const updateAddonGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const lang = req.lang as TLanguageCode;
  const result = await AddOnsServices.updateAddonGroup(
    addonGroupId,
    req.body,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Addon Group',
    target:
      (lang === 'en' ? result?.data?.title?.en : result?.data?.title?.pt) ||
      addonGroupId,
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

// add option to addon group controller
const addOptionToGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const lang = req.lang as TLanguageCode;
  const result = await AddOnsServices.addOptionToAddonGroup(
    addonGroupId,
    req.body,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Added Option to Addon Group',
    target: req.body.name?.[lang] || req.body.name?.en || addonGroupId,
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

// toggle option status controller
const toggleOptionStatus = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const { optionSku } = req.body;
  const currentUser = req.user as TCurrentUser;
  const result = await AddOnsServices.toggleOptionStatus(
    addonGroupId,
    optionSku as string,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Toggled Addon Option Status',
    target: optionSku as string,
    type: 'WARNING',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// delete option from addon group controller
const deleteOptionFromGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const { optionSku } = req.body;
  const currentUser = req.user as TCurrentUser;
  const result = await AddOnsServices.deleteOptionFromAddonGroup(
    addonGroupId,
    optionSku,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Deleted Addon Option',
    target: optionSku,
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

// get all addon groups controller
const getAllAddonGroups = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const role = currentUser?.role;
  const result = await AddOnsServices.getAllAddonGroups(req.query, currentUser);

  let formattedData;
  if (role === 'CUSTOMER') {
    formattedData = formatAddonGroupResponse(result?.data, req.lang);
  } else {
    formattedData = result?.data;
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result.meta,
    data: formattedData,
  });
});

// get single addon group controller
const getSingleAddonGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const role = currentUser?.role;
  const result = await AddOnsServices.getSingleAddonGroup(
    addonGroupId,
    currentUser,
  );

  let formattedData;
  if (role === 'CUSTOMER') {
    formattedData = formatAddonGroupResponse(result?.data, req.lang);
  } else {
    formattedData = result?.data;
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

// soft delete addon group controller
const softDeleteAddonGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await AddOnsServices.softDeleteAddonGroup(
    addonGroupId,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted Addon Group',
    target: addonGroupId,
    type: 'DANGER',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: null,
  });
});

export const AddOnsControllers = {
  createAddonGroup,
  updateAddonGroup,
  addOptionToGroup,
  toggleOptionStatus,
  deleteOptionFromGroup,
  getAllAddonGroups,
  getSingleAddonGroup,
  softDeleteAddonGroup,
};
