/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthUser } from '../../constant/user.constant';
import { TAddonGroup } from './addOns.interface';
import { AddonGroup } from './addOns.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { Tax } from '../Tax/tax.model';

// create addon group service
const createAddonGroup = async (
  payload: TAddonGroup,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your vendor account is not approved yet!',
    );
  }

  const isGroupExists = await AddonGroup.findOne({
    vendorId: currentUser._id,
    title: { $regex: new RegExp(`^${payload.title}$`, 'i') },
    isDeleted: false,
  });

  if (isGroupExists) {
    throw new AppError(
      httpStatus.CONFLICT,
      'An addon group with this title already exists!',
    );
  }

  if (payload.options && payload.options.length > 0) {
    const taxIds = [
      ...new Set(payload.options.map((opt) => opt.tax).filter(Boolean)),
    ];

    if (taxIds.length > 0) {
      const existingTaxesCount = await Tax.countDocuments({
        _id: { $in: taxIds },
        isDeleted: false,
      });

      if (existingTaxesCount !== taxIds.length) {
        throw new AppError(
          httpStatus.NOT_FOUND,
          'One or more assigned tax records were not found',
        );
      }
    }
  }

  const addonData = {
    ...payload,
    vendorId: currentUser._id,
  };

  const result = (await AddonGroup.create(addonData)).populate('options.tax');
  return result;
};

// update addon group service
const updateAddonGroup = async (
  id: string,
  payload: Partial<TAddonGroup>,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your vendor account is not approved yet!',
    );
  }
  const isGroupExists = await AddonGroup.findOne({
    _id: { $ne: id },
    vendorId: currentUser._id,
    title: { $regex: new RegExp(`^${payload.title}$`, 'i') },
    isDeleted: false,
  });

  if (isGroupExists) {
    throw new AppError(
      httpStatus.CONFLICT,
      'An addon group with this title already exists!',
    );
  }

  if (payload.options && payload.options.length > 0) {
    const taxIds = [
      ...new Set(payload.options.map((opt) => opt.tax).filter(Boolean)),
    ];

    if (taxIds.length > 0) {
      const existingTaxesCount = await Tax.countDocuments({
        _id: { $in: taxIds },
        isDeleted: false,
      });

      if (existingTaxesCount !== taxIds.length) {
        throw new AppError(
          httpStatus.NOT_FOUND,
          'One or more tax records are invalid or deleted',
        );
      }
    }
  }

  const { options, ...remainingData } = payload;
  const modifiedUpdatedData: Record<string, unknown> = { ...remainingData };

  if (options && Array.isArray(options)) {
    modifiedUpdatedData.options = options;
  }

  const result = await AddonGroup.findOneAndUpdate(
    {
      _id: id,
      vendorId: currentUser._id,
      isDeleted: false,
    },
    { $set: modifiedUpdatedData },
    {
      new: true,
      runValidators: true,
    },
  ).populate('options.tax');

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Addon group not found or you do not have permission to edit it',
    );
  }

  return result;
};

// add option to addon group service
const addOptionToAddonGroup = async (
  groupId: string,
  newOption: { name: string; price: number; tax: string },
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your vendor account is not approved yet!',
    );
  }

  if (newOption.tax) {
    const taxExists = await Tax.exists({
      _id: newOption.tax,
      isDeleted: false,
    });
    if (!taxExists) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'The provided Tax ID is invalid',
      );
    }
  }

  const group = await AddonGroup.findOne({
    _id: groupId,
    vendorId: currentUser._id,
  });
  if (!group) {
    throw new AppError(httpStatus.NOT_FOUND, 'Addon group not found');
  }

  const isDuplicate = group.options.some(
    (opt) => opt.name.toLowerCase() === newOption.name.toLowerCase(),
  );

  if (isDuplicate) {
    throw new AppError(
      httpStatus.CONFLICT,
      'An option with this name already exists in this group',
    );
  }

  const result = await AddonGroup.findOneAndUpdate(
    { _id: groupId, vendorId: currentUser._id, isDeleted: false },
    {
      $push: { options: { ...newOption, isActive: true } },
    },
    { new: true, runValidators: true },
  ).populate('options.tax');

  return result;
};

// toggle option status (active/inactive)
const toggleOptionStatus = async (
  groupId: string,
  optionId: string,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your vendor account is not approved yet!',
    );
  }

  const group = await AddonGroup.findOne({
    _id: groupId,
    vendorId: currentUser._id,
    'options._id': optionId,
    isDeleted: false,
  });

  if (!group) {
    throw new AppError(httpStatus.NOT_FOUND, 'Addon Group or Option not found');
  }

  const currentOption = group.options.find(
    (opt: any) => opt._id.toString() === optionId,
  );

  if (!currentOption)
    throw new AppError(httpStatus.NOT_FOUND, 'Option not found');

  const newStatus = !currentOption.isActive;

  const result = await AddonGroup.findOneAndUpdate(
    {
      _id: groupId,
      'options._id': optionId,
    },
    {
      $set: { 'options.$.isActive': newStatus },
    },
    {
      new: true,
      runValidators: true,
    },
  ).populate('options.tax');

  return result;
};

// delete option from addon group service
const deleteOptionFromAddonGroup = async (
  groupId: string,
  optionId: string,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your vendor account is not approved yet!',
    );
  }

  const result = await AddonGroup.findOneAndUpdate(
    {
      _id: groupId,
      vendorId: currentUser._id,
      isDeleted: false,
      'options._id': optionId,
    },
    {
      $pull: { options: { _id: optionId } },
    },
    { new: true },
  ).populate('options.tax');

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Addon group not found or the option does not exist in this group',
    );
  }

  return result;
};

// get all addon groups service
const getAllAddonGroups = async (
  query: Record<string, unknown>,
  currentUser: AuthUser,
) => {
  if (currentUser.role === 'VENDOR') {
    query.vendorId = currentUser._id;
  }

  query.isDeleted = false;

  const addOns = new QueryBuilder(
    AddonGroup.find().populate('options.tax'),
    query,
  )
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(['title']);

  const [meta, data] = await Promise.all([
    addOns.countTotal(),
    addOns.modelQuery,
  ]);

  return {
    meta,
    data,
  };
};

// get single addon group service
const getSingleAddonGroup = async (id: string, currentUser: AuthUser) => {
  const queryObj: any = { _id: id, isDeleted: false };

  if (currentUser.role === 'VENDOR') {
    queryObj.vendorId = currentUser._id;
  }

  const result = await AddonGroup.findOne(queryObj)
    .populate('options.tax')
    .lean();

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Addon group not found');
  }

  return result;
};

// soft delete addon group
const softDeleteAddonGroup = async (id: string, currentUser: AuthUser) => {
  const query: Record<string, any> = { _id: id, isDeleted: false };

  if (currentUser.role === 'VENDOR') {
    query.vendorId = currentUser._id;
  }

  const result = await AddonGroup.findOneAndUpdate(
    query,
    { $set: { isDeleted: true } },
    { new: true },
  );

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Addon group not found, already deleted, or unauthorized',
    );
  }

  return {
    message: 'Addon group deleted successfully',
  };
};
export const AddOnsServices = {
  createAddonGroup,
  updateAddonGroup,
  addOptionToAddonGroup,
  toggleOptionStatus,
  deleteOptionFromAddonGroup,
  getAllAddonGroups,
  getSingleAddonGroup,
  softDeleteAddonGroup,
};
