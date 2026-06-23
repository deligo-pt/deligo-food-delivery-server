import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TCuisine } from './category.interface';
import { Cuisine } from './category.model';
import { formatCuisineResponse } from './category.utils';

// Create Cuisine
const createCuisine = async (payload: TCuisine, image: string | null) => {
  const exists = await Cuisine.findOne({
    'name.en': payload.name.en.toUpperCase(),
  });

  if (exists) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Cuisine already exists. Please choose a different name.',
    );
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
    throw new AppError(httpStatus.BAD_REQUEST, 'Cuisine image is required');
  }

  const cuisine = await Cuisine.create(payload);
  return cuisine;
};

// Update Cuisine
const updateCuisine = async (
  id: string,
  payload: Partial<TCuisine>,
  image: string | null,
) => {
  const cuisine = await Cuisine.findById(id);
  if (!cuisine) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cuisine not found');
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
      `Cuisine is already ${cuisine.isActive ? 'active' : 'inactive'}`,
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

  return cuisine;
};

// Get All Cuisines (Protected / Admin & Vendor Layouts)
const getAllCuisines = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
  lng: 'en' | 'pt',
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

  const formattedData = data.map((cuisine) =>
    formatCuisineResponse(cuisine, lng),
  );

  return { meta, data: formattedData };
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

  return { meta, data };
};

// Get Single Cuisine
const getSingleCuisine = async (id: string, currentUser: TCurrentUser) => {
  const cuisine = await Cuisine.findById(id);
  if (!cuisine) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cuisine not found');
  }

  const { role } = currentUser;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  if (!isAdmin && (cuisine.isDeleted || !cuisine.isActive)) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cuisine not found');
  }

  return cuisine;
};

// Get Single Cuisine Public
const getSingleCuisinePublic = async (id: string) => {
  const cuisine = await Cuisine.findById(id);
  if (!cuisine) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cuisine not found');
  }

  if (cuisine.isDeleted || !cuisine.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cuisine not found');
  }

  return cuisine;
};

// Soft Delete Cuisine
const softDeleteCuisine = async (id: string) => {
  const cuisine = await Cuisine.findById(id);
  if (!cuisine) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cuisine not found');
  }

  if (cuisine.isDeleted === true) {
    throw new AppError(httpStatus.CONFLICT, 'Cuisine already soft deleted');
  }

  if (cuisine.isActive) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Cannot delete an active cuisine. Turn it off first.',
    );
  }

  cuisine.isDeleted = true;
  await cuisine.save();

  return {
    message: 'Cuisine soft deleted successfully',
  };
};

// Permanent Delete Cuisine
const permanentDeleteCuisine = async (id: string) => {
  const cuisine = await Cuisine.findById(id);
  if (!cuisine) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cuisine not found');
  }

  if (cuisine.isDeleted === false) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Please soft delete the cuisine first',
    );
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
    message: 'Cuisine permanently deleted successfully',
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
