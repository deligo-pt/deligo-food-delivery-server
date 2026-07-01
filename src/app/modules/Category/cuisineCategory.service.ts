import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TCuisine } from './category.interface';
import { Cuisine } from './category.model';

// Create Cuisine
const createCuisine = async (payload: TCuisine, image: string | null) => {
  const exists = await Cuisine.findOne({
    'name.en': payload.name.en.toUpperCase(),
  });

  if (exists) {
    throw new AppError(httpStatus.CONFLICT, 'ALREADY_EXISTS');
  }

  payload.name.en = payload.name.en.toUpperCase();
  payload.name.pt = payload.name.pt.toUpperCase();

  payload.slug = payload.name.en
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');

  if (image) {
    payload.imageUrl = image;
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, 'IMAGE_REQUIRED');
  }

  const cuisine = await Cuisine.create(payload);
  return {
    messageKey: 'CREATE_SUCCESS' as const,
    data: cuisine,
  };
};

// Update Cuisine
const updateCuisine = async (
  id: string,
  payload: Partial<TCuisine>,
  image: string | null,
) => {
  const cuisine = await Cuisine.findById(id);
  if (!cuisine) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  if (payload.name) {
    payload.name = {
      ...cuisine.name,
      ...payload.name,
    };

    if (payload.name.en) payload.name.en = payload.name.en.toUpperCase();
    if (payload.name.pt) payload.name.pt = payload.name.pt.toUpperCase();

    if (payload.name.en) {
      payload.slug = payload.name.en
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
    }
  }

  if (
    payload?.isActive !== undefined &&
    payload.isActive === cuisine.isActive
  ) {
    throw new AppError(
      httpStatus.CONFLICT,
      cuisine.isActive ? 'ALREADY_ACTIVE' : 'ALREADY_INACTIVE',
    );
  }

  if (image) {
    if (cuisine.imageUrl) {
      const oldImage = cuisine.imageUrl;
      deleteSingleImageFromCloudinary(oldImage).catch((error) => {
        console.error('Failed to delete old image from Cloudinary:', error);
      });
    }
    cuisine.imageUrl = image;
  }

  Object.assign(cuisine, payload);
  await cuisine.save();

  return {
    messageKey: 'UPDATE_SUCCESS' as const,
    data: cuisine,
  };
};

// Get All Cuisines (Protected / Admin & Vendor Layouts)
const getAllCuisines = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  const { role } = currentUser;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  // Non-admins can only view active and non-deleted cuisines
  if (!isAdmin) {
    query.isActive = true;
    query.isDeleted = false;
  }

  const cuisineQuery = new QueryBuilder(Cuisine.find(), query)
    .search(['name', 'slug'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [meta, data] = await Promise.all([
    cuisineQuery.countTotal(),
    cuisineQuery.modelQuery,
  ]);

  return {
    messageKey: 'FETCH_ALL_SUCCESS' as const,
    meta,
    data,
  };
};

// Get All Cuisines Public
const getAllCuisinesPublic = async (query: Record<string, unknown>) => {
  query.isActive = true;
  query.isDeleted = false;

  const cuisineQuery = new QueryBuilder(Cuisine.find(), query)
    .search(['name', 'slug'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [meta, data] = await Promise.all([
    cuisineQuery.countTotal(),
    cuisineQuery.modelQuery,
  ]);

  return {
    messageKey: 'FETCH_ALL_SUCCESS' as const,
    meta,
    data,
  };
};

// Get Single Cuisine
const getSingleCuisine = async (id: string, currentUser: TCurrentUser) => {
  const cuisine = await Cuisine.findById(id);
  if (!cuisine) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  const { role } = currentUser;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  if (!isAdmin && (cuisine.isDeleted || !cuisine.isActive)) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  return {
    messageKey: 'FETCH_SINGLE_SUCCESS' as const,
    data: cuisine,
  };
};

// Get Single Cuisine Public
const getSingleCuisinePublic = async (id: string) => {
  const cuisine = await Cuisine.findById(id);
  if (!cuisine) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  if (cuisine.isDeleted || !cuisine.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  return {
    messageKey: 'FETCH_SINGLE_SUCCESS' as const,
    data: cuisine,
  };
};

// Soft Delete Cuisine
const softDeleteCuisine = async (id: string) => {
  const cuisine = await Cuisine.findById(id);
  if (!cuisine) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  if (cuisine.isDeleted === true) {
    throw new AppError(httpStatus.CONFLICT, 'ALREADY_SOFT_DELETED');
  }

  if (cuisine.isActive) {
    throw new AppError(httpStatus.CONFLICT, 'CANNOT_DELETE_ACTIVE');
  }

  cuisine.isDeleted = true;
  await cuisine.save();

  return {
    messageKey: 'SOFT_DELETE_SUCCESS' as const,
  };
};

// Permanent Delete Cuisine
const permanentDeleteCuisine = async (id: string) => {
  const cuisine = await Cuisine.findById(id);
  if (!cuisine) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  if (cuisine.isDeleted === false) {
    throw new AppError(httpStatus.CONFLICT, 'SOFT_DELETE_FIRST');
  }

  // Final cleanup of the image resource from Cloudinary storage
  if (cuisine.imageUrl) {
    deleteSingleImageFromCloudinary(cuisine.imageUrl).catch((error) => {
      console.error(
        'Failed to clean up Cloudinary assets during permanent destruction:',
        error,
      );
    });
  }

  await Cuisine.findByIdAndDelete(id);
  return {
    messageKey: 'PERMANENT_DELETE_SUCCESS' as const,
  };
};

export const CuisineService = {
  createCuisine,
  updateCuisine,
  getAllCuisines,
  getAllCuisinesPublic,
  getSingleCuisine,
  getSingleCuisinePublic,
  softDeleteCuisine,
  permanentDeleteCuisine,
};
