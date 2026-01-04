import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AddOnsServices } from './addOns.service';
import { AuthUser } from '../../constant/user.constant';

// create addon group controller
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

// update addon group controller
const updateAddonGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const result = await AddOnsServices.updateAddonGroup(
    addonGroupId,
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Addon group updated successfully',
    data: result,
  });
});

// add option to addon group controller
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

// delete option from addon group controller
const deleteOptionFromGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const { optionName } = req.query;
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

// get all addon groups controller
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

// get single addon group controller
const getSingleAddonGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const result = await AddOnsServices.getSingleAddonGroup(
    addonGroupId,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Addon group fetched successfully',
    data: result,
  });
});

// toggle option status controller
const toggleOptionStatus = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const { optionId } = req.body;
  const result = await AddOnsServices.toggleOptionStatus(
    addonGroupId,
    optionId as string,
    req.user as AuthUser
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Option status updated successfully',
    data: result,
  });
});

// soft delete addon group controller
const softDeleteAddonGroup = catchAsync(async (req, res) => {
  const { addonGroupId } = req.params;
  const result = await AddOnsServices.softDeleteAddonGroup(
    addonGroupId,
    req.user as AuthUser
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
  deleteOptionFromGroup,
  getAllAddonGroups,
  getSingleAddonGroup,
  toggleOptionStatus,
  softDeleteAddonGroup,
};
