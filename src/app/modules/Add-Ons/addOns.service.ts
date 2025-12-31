import { AuthUser } from '../../constant/user.constant';
import { Vendor } from '../Vendor/vendor.model';
import { TAddonGroup } from './addOns.interface';
import { AddonGroup } from './addOns.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { QueryBuilder } from '../../builder/QueryBuilder';

// create addon group service
const createAddonGroup = async (
  payload: TAddonGroup,
  currentUser: AuthUser
) => {
  const existingVendor = await Vendor.findOne({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (!existingVendor) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Vendor profile not found for this user!'
    );
  }

  const isGroupExists = await AddonGroup.findOne({
    vendorId: existingVendor._id,
    title: { $regex: new RegExp(`^${payload.title}$`, 'i') },
    isDeleted: false,
  });

  if (isGroupExists) {
    throw new AppError(
      httpStatus.CONFLICT,
      'An addon group with this title already exists!'
    );
  }

  const addonData = {
    ...payload,
    vendorId: existingVendor._id,
  };

  const result = await AddonGroup.create(addonData);
  return result;
};

const getVendorAddonGroups = async (vendorId: string) => {
  const result = await AddonGroup.find({ vendorId, isDeleted: false });
  return result;
};

const updateAddonGroup = async (id: string, payload: Partial<TAddonGroup>) => {
  const result = await AddonGroup.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const addOptionToAddonGroup = async (
  groupId: string,
  newOption: { name: string; price: number },
  currentUser: AuthUser
) => {
  const existingVendor = await Vendor.findOne({ userId: currentUser.id });

  const result = await AddonGroup.findOneAndUpdate(
    { _id: groupId, vendorId: existingVendor?._id, isDeleted: false },
    {
      $push: { options: { ...newOption, isActive: true } },
    },
    { new: true, runValidators: true }
  );

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Addon group not found or unauthorized'
    );
  }

  return result;
};

const deleteOptionFromAddonGroup = async (
  groupId: string,
  optionName: string,
  currentUser: AuthUser
) => {
  const existingVendor = await Vendor.findOne({ userId: currentUser.id });

  const result = await AddonGroup.findOneAndUpdate(
    { _id: groupId, vendorId: existingVendor?._id },
    {
      $pull: { options: { name: optionName } },
    },
    { new: true }
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Addon group or option not found');
  }

  return result;
};

const getAllAddonGroups = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  const { user: loggedInUser } = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (loggedInUser.role === 'VENDOR') {
    query.vendorId = loggedInUser._id;
  }

  const addOns = new QueryBuilder(AddonGroup.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search([]);

  //   const populateOptions = getPopulateOptions(loggedInUser.role, {
  //     vendor: 'name userId role',
  //     admin: 'name userId role',
  //   });
  //   populateOptions.forEach((option) => {
  //     addOns.modelQuery = addOns.modelQuery.populate(option);
  //   });

  const meta = await addOns.countTotal();
  const data = await addOns.modelQuery;
  const result = { meta, data };

  return result;
};

const getSingleAddonGroup = async (id: string, currentUser: AuthUser) => {
  const { user: loggedInUser } = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  let query;
  if (loggedInUser.role === 'VENDOR') {
    query = AddonGroup.findOne({ _id: id, vendorId: loggedInUser._id });
  } else {
    query = AddonGroup.findOne({ _id: id });
  }
  const result = await query;
  return result;
};

export const AddOnsServices = {
  createAddonGroup,
  getVendorAddonGroups,
  updateAddonGroup,
  addOptionToAddonGroup,
  deleteOptionFromAddonGroup,
  getAllAddonGroups,
  getSingleAddonGroup,
};
