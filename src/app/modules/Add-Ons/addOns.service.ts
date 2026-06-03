/* eslint-disable @typescript-eslint/no-explicit-any */
import { TAddonGroup } from './addOns.interface';
import { AddonGroup } from './addOns.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { Tax } from '../Tax/tax.model';
import { TAuthUser } from '../AuthUser/authUser.interface';

// create addon group service
const createAddonGroup = async (
  payload: TAddonGroup,
  currentUser: TAuthUser,
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

  payload.options = payload.options.map((opt) => {
    if (!opt.sku) {
      const cleanTitle = payload.title.substring(0, 3).toUpperCase();
      const cleanName = opt.name.substring(0, 3).toUpperCase();
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
    'taxRate',
  );

  return result;
};

// update addon group service
const updateAddonGroup = async (
  id: string,
  payload: Partial<TAddonGroup>,
  currentUser: TAuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your vendor account is not approved yet!',
    );
  }

  if (payload.title) {
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
  }

  const currentGroup = await AddonGroup.findOne({
    _id: id,
    vendorId: currentUser._id,
    isDeleted: false,
  }).lean();

  if (!currentGroup) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Addon group not found or you do not have permission to edit it',
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

    const updatedOptions = (currentGroup.options as any[]).map(
      (existingOpt) => {
        const incomingUpdate = payload?.options?.find(
          (incomingOpt: any) =>
            incomingOpt.sku && incomingOpt.sku === existingOpt.sku,
        );

        if (incomingUpdate) {
          return {
            ...existingOpt,
            ...incomingUpdate,
          };
        }

        return existingOpt;
      },
    );

    payload.options = updatedOptions as any;
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
  ).populate('options.tax', 'taxRate');

  return result;
};

// add option to addon group service
const addOptionToAddonGroup = async (
  groupId: string,
  newOption: { name: string; price: number; tax: string; sku?: string },
  currentUser: TAuthUser,
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

  if (!newOption.sku) {
    const cleanTitle = group.title.substring(0, 3).toUpperCase();
    const cleanName = newOption.name.substring(0, 3).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    newOption.sku = `ADD-${cleanTitle}-${cleanName}-${randomStr}`;
  }

  const result = await AddonGroup.findOneAndUpdate(
    { _id: groupId, vendorId: currentUser._id, isDeleted: false },
    {
      $push: { options: { ...newOption, isActive: true } },
    },
    { new: true, runValidators: true },
  ).populate('options.tax', 'taxRate');

  return result;
};

// toggle option status (active/inactive)
const toggleOptionStatus = async (
  groupId: string,
  optionSku: string,
  currentUser: TAuthUser,
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
      'options.sku': optionSku,
      isDeleted: false,
    },
    [
      {
        $set: {
          options: {
            $map: {
              input: '$options',
              as: 'opt',
              in: {
                $cond: [
                  { $eq: ['$$opt.sku', optionSku] },
                  {
                    $mergeObjects: [
                      '$$opt',
                      { isActive: { $not: '$$opt.isActive' } },
                    ],
                  },
                  '$$opt',
                ],
              },
            },
          },
        },
      },
    ],
    {
      new: true,
      runValidators: true,
    },
  ).populate('options.tax', 'taxRate');

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Addon Group or Option SKU not found',
    );
  }

  return result;
};

// delete option from addon group service
const deleteOptionFromAddonGroup = async (
  groupId: string,
  optionSku: string,
  currentUser: TAuthUser,
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
      'options.sku': optionSku,
    },
    {
      $pull: { options: { sku: optionSku } },
    },
    {
      new: true,
    },
  ).populate('options.tax', 'taxRate');

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Addon group not found or the option SKU does not exist in this group',
    );
  }

  return result;
};

// get all addon groups service
const getAllAddonGroups = async (
  query: Record<string, unknown>,
  currentUser: TAuthUser,
) => {
  if (currentUser.role === 'VENDOR') {
    query.vendorId = currentUser._id;
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  if (!isAdmin) {
    query.isDeleted = false;
  }

  const addOns = new QueryBuilder(
    AddonGroup.find().populate('options.tax', 'taxRate'),
    query,
  )
    .search(['title'])
    .filter()
    .sort()
    .paginate()
    .fields();

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
const getSingleAddonGroup = async (id: string, currentUser: TAuthUser) => {
  const queryObj: any = { _id: id };

  if (currentUser.role === 'VENDOR') {
    queryObj.vendorId = currentUser._id;
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  if (!isAdmin) {
    queryObj.isDeleted = false;
  }

  const result = await AddonGroup.findOne(queryObj)
    .populate('options.tax', 'taxRate')
    .lean();

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Addon group not found');
  }

  return result;
};

// soft delete addon group
const softDeleteAddonGroup = async (id: string, currentUser: TAuthUser) => {
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
