import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AddOnsServices } from './addOns.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { formatAddonGroupResponse } from './addOns.utils';

// create addon group controller
const createAddonGroup = catchAsync(async (req, res) => {
  const result = await AddOnsServices.createAddonGroup(
    req.body,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

// update addon group controller
const updateAddonGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const result = await AddOnsServices.updateAddonGroup(
    addonGroupId,
    req.body,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

// add option to addon group controller
const addOptionToGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const result = await AddOnsServices.addOptionToAddonGroup(
    addonGroupId,
    req.body,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

// toggle option status controller
const toggleOptionStatus = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const { optionSku } = req.body;
  const result = await AddOnsServices.toggleOptionStatus(
    addonGroupId,
    optionSku as string,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

// delete option from addon group controller
const deleteOptionFromGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const { optionSku } = req.body;
  const result = await AddOnsServices.deleteOptionFromAddonGroup(
    addonGroupId,
    optionSku,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
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
    message: result?.message,
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
    message: result?.message,
    data: formattedData,
  });
});

// soft delete addon group controller
const softDeleteAddonGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const result = await AddOnsServices.softDeleteAddonGroup(
    addonGroupId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
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
