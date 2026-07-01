/* eslint-disable @typescript-eslint/no-explicit-any */
import { TAddonGroup } from './addOns.interface';
import { AddonGroup } from './addOns.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { Tax } from '../Tax/tax.model';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TLocalizedText } from '../../constant/GlobalInterface/language.interface';

// create addon group service
const createAddonGroup = async (
  payload: TAddonGroup,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'VENDOR_NOT_APPROVED');
  }

  const isGroupExists = await AddonGroup.findOne({
    vendorId: currentUser._id,
    'title.en': { $regex: new RegExp(`^${payload.title.en}$`, 'i') },
    isDeleted: false,
  });

  if (isGroupExists) {
    throw new AppError(httpStatus.CONFLICT, 'GROUP_ALREADY_EXISTS');
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
        throw new AppError(httpStatus.NOT_FOUND, 'TAX_RECORDS_NOT_FOUND');
      }
    }
  }

  payload.options = payload.options.map((opt) => {
    if (!opt.sku) {
      const cleanTitle = payload.title.en.substring(0, 3).toUpperCase();
      const cleanName = opt.name.en.substring(0, 3).toUpperCase();
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 5)
        .toUpperCase();
      opt.sku = `ADD-${cleanTitle}-${cleanName}-${randomStr}`;
    }
    return opt;
  });

  const addonData = {
    ...payload,
    vendorId: currentUser._id,
  };

  const createdRecord = await AddonGroup.create(addonData);

  const result = await AddonGroup.findById(createdRecord._id).populate(
    'options.tax',
    'taxName taxCode taxRate',
  );

  return {
    messageKey: 'CREATE_SUCCESS' as const,
    data: result,
  };
};

// update addon group service
const updateAddonGroup = async (
  id: string,
  payload: Partial<TAddonGroup>,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'VENDOR_NOT_APPROVED');
  }

  if (payload.title && payload.title.en) {
    const isGroupExists = await AddonGroup.findOne({
      _id: { $ne: id },
      vendorId: currentUser._id,
      'title.en': { $regex: new RegExp(`^${payload.title.en}$`, 'i') },
      isDeleted: false,
    });

    if (isGroupExists) {
      throw new AppError(httpStatus.CONFLICT, 'GROUP_ALREADY_EXISTS');
    }
  }

  if (payload.options && payload.options.length > 0) {
    const taxIds = [
      ...new Set(payload.options.map((opt: any) => opt.tax).filter(Boolean)),
    ];

    if (taxIds.length > 0) {
      const existingTaxesCount = await Tax.countDocuments({
        _id: { $in: taxIds },
        isDeleted: false,
      });

      if (existingTaxesCount !== taxIds.length) {
        throw new AppError(httpStatus.NOT_FOUND, 'TAX_RECORDS_INVALID');
      }
    }
  }

  if (payload.options && payload.options.length > 0) {
    const currentGroup = await AddonGroup.findById(id);
    if (!currentGroup) {
      throw new AppError(httpStatus.NOT_FOUND, 'GROUP_NOT_FOUND');
    }

    const groupTitleEnglish =
      payload.title?.en || currentGroup.title?.en || 'ADD';

    payload.options = payload.options.map((opt: any) => {
      if (!opt.sku) {
        const cleanTitle = groupTitleEnglish.substring(0, 3).toUpperCase();
        const cleanName = (opt.name?.en || 'OPT').substring(0, 3).toUpperCase();
        const randomStr = Math.random()
          .toString(36)
          .substring(2, 5)
          .toUpperCase();
        opt.sku = `ADD-${cleanTitle}-${cleanName}-${randomStr}`;
      }
      return opt;
    });
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
  ).populate('options.tax', 'taxName taxCode taxRate');

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'UPDATE_NOT_FOUND_OR_UNAUTHORIZED',
    );
  }

  return {
    messageKey: 'UPDATE_SUCCESS' as const,
    data: result,
  };
};

// add option to addon group service
const addOptionToAddonGroup = async (
  groupId: string,
  newOption: {
    name: TLocalizedText;
    price: number;
    tax: string;
    sku?: string;
  },
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'VENDOR_NOT_APPROVED');
  }

  if (newOption.tax) {
    const taxExists = await Tax.exists({
      _id: newOption.tax,
      isDeleted: false,
    });
    if (!taxExists) {
      throw new AppError(httpStatus.NOT_FOUND, 'TAX_ID_INVALID');
    }
  }

  const group = await AddonGroup.findOne({
    _id: groupId,
    vendorId: currentUser._id,
    isDeleted: false,
  });
  if (!group) {
    throw new AppError(httpStatus.NOT_FOUND, 'GROUP_NOT_FOUND');
  }

  const isDuplicate = group.options.some((opt) => {
    const existingNameEn = opt?.name?.en?.toLowerCase() || '';
    const newNameEn = newOption?.name?.en?.toLowerCase() || '';

    if (!existingNameEn || !newNameEn) return false;

    return existingNameEn === newNameEn;
  });

  if (isDuplicate) {
    throw new AppError(httpStatus.CONFLICT, 'OPTION_ALREADY_EXISTS');
  }

  if (!newOption.sku) {
    const groupTitleEnglish = group.title?.en || 'ADD';
    const optionNameEnglish = newOption.name?.en || 'OPT';

    const cleanTitle = groupTitleEnglish.substring(0, 3).toUpperCase();
    const cleanName = optionNameEnglish.substring(0, 3).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();

    newOption.sku = `ADD-${cleanTitle}-${cleanName}-${randomStr}`;
  }

  const result = await AddonGroup.findOneAndUpdate(
    { _id: groupId, vendorId: currentUser._id, isDeleted: false },
    {
      $push: { options: { ...newOption, isActive: true } },
    },
    { new: true, runValidators: true },
  ).populate('options.tax', 'taxName taxCode taxRate');

  return {
    messageKey: 'ADD_OPTION_SUCCESS' as const,
    data: result,
  };
};

// toggle option status (active/inactive)
const toggleOptionStatus = async (
  groupId: string,
  optionSku: string,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'VENDOR_NOT_APPROVED');
  }

  const group = await AddonGroup.findOne({
    _id: groupId,
    vendorId: currentUser._id,
    'options.sku': optionSku,
    isDeleted: false,
  });

  if (!group) {
    throw new AppError(httpStatus.NOT_FOUND, 'GROUP_OR_OPTION_NOT_FOUND');
  }

  const currentOption = group.options.find((opt: any) => opt.sku === optionSku);

  if (!currentOption) {
    throw new AppError(httpStatus.NOT_FOUND, 'OPTION_NOT_FOUND');
  }

  const newStatus = !currentOption.isActive;

  const result = await AddonGroup.findOneAndUpdate(
    {
      _id: groupId,
      'options.sku': optionSku,
    },
    {
      $set: { 'options.$.isActive': newStatus },
    },
    {
      new: true,
      runValidators: true,
    },
  ).populate('options.tax', 'taxName taxCode taxRate');

  return {
    messageKey: 'TOGGLE_OPTION_SUCCESS' as const,
    variables: { status: newStatus ? 'active' : 'inactive' },
    data: result,
  };
};

// delete option from addon group service
const deleteOptionFromAddonGroup = async (
  groupId: string,
  optionSku: string,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'VENDOR_NOT_APPROVED');
  }

  const result = await AddonGroup.findOneAndUpdate(
    {
      _id: groupId,
      vendorId: currentUser._id,
      isDeleted: false,
      'options.sku': optionSku,
    },
    {
      $pull: { options: { sku: optionSku } },
    },
    { new: true },
  ).populate('options.tax', 'taxName taxCode taxRate');

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'DELETE_OPTION_NOT_FOUND_OR_UNAUTHORIZED',
    );
  }

  return {
    messageKey: 'DELETE_OPTION_SUCCESS' as const,
    data: result,
  };
};

// get all addon groups service
const getAllAddonGroups = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  if (currentUser.role === 'VENDOR') {
    query.vendorId = currentUser._id;
  }

  query.isDeleted = false;

  const addOns = new QueryBuilder(
    AddonGroup.find().populate('options.tax', 'taxName taxCode taxRate'),
    query,
  )
    .search(['title.en', 'title.pt', 'options.name.en', 'options.name.pt'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [meta, data] = await Promise.all([
    addOns.countTotal(),
    addOns.modelQuery,
  ]);

  return {
    messageKey: 'FETCH_ALL_SUCCESS' as const,
    meta,
    data,
  };
};

// get single addon group service
const getSingleAddonGroup = async (id: string, currentUser: TCurrentUser) => {
  const queryObj: any = { _id: id, isDeleted: false };

  if (currentUser.role === 'VENDOR') {
    queryObj.vendorId = currentUser._id;
  }

  const result = await AddonGroup.findOne(queryObj)
    .populate('options.tax', 'taxName taxCode taxRate')
    .lean();

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'GROUP_NOT_FOUND');
  }

  return {
    messageKey: 'FETCH_SINGLE_SUCCESS' as const,
    data: result,
  };
};

// soft delete addon group
const softDeleteAddonGroup = async (id: string, currentUser: TCurrentUser) => {
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
      'DELETE_NOT_FOUND_OR_UNAUTHORIZED',
    );
  }

  return {
    messageKey: 'DELETE_SUCCESS' as const,
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
