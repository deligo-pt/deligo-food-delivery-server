import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import AppError from '../../errors/AppError';
import { Ingredient } from './ingredients.model';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { IngredientsSearchFields } from './ingredients.constant';
import { TIngredients } from './ingredients.interface';
import customNanoId from '../../utils/customNanoId';
import { Tax } from '../Tax/tax.model';

const createIngredient = async (
  payload: TIngredients,
  currentUser: TCurrentUser,
) => {
  // 1. Role Validation
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only administrators can perform this action',
    );
  }

  const isTaxExist = await Tax.findOne({
    _id: payload.tax,
    isDeleted: false,
    isActive: true,
  });

  if (!isTaxExist) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'The provided Tax configuration ID is invalid, inactive, or does not exist.',
    );
  }

  // 3. Category Formatting
  const formattedCategory = payload.category.toUpperCase().trim();
  payload.category = formattedCategory;
  const categorySuffix = formattedCategory.substring(0, 3);

  // 4. Unique SKU Generation
  let isUnique = false;
  let generatedSku = '';

  while (!isUnique) {
    const shortId = customNanoId(4);
    generatedSku = `ING-${categorySuffix}-${shortId}`;

    const existingSku = await Ingredient.findOne({ sku: generatedSku }).lean();
    if (!existingSku) {
      isUnique = true;
    }
  }

  payload.sku = generatedSku;

  // 5. Database Insertion
  const newIngredient = await Ingredient.create(payload);

  return newIngredient;
};

const updateIngredient = async (
  id: string,
  payload: Partial<TIngredients>,
  image: string | null,
) => {
  const ingredient = await Ingredient.findById(id);
  if (!ingredient) {
    throw new AppError(httpStatus.NOT_FOUND, 'Ingredient not found');
  }

  // delete existing image and replace new one
  if (image) {
    if (ingredient.image) {
      const oldImage = ingredient.image;
      deleteSingleImageFromCloudinary(oldImage).catch((error) => {
        console.error('Cloudinary delete error:', error);
      });
    }
    payload.image = image;
  }

  // Update category to UpperCase if it exists in payload
  if (payload.category) {
    payload.category = payload.category.toUpperCase().trim();
  }

  Object.assign(ingredient, payload);
  await ingredient.save();
  return ingredient;
};

const getIngredientDetails = async (sku: string) => {
  const result = await Ingredient.findOne({ sku });
  if (!result || result.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Ingredient not found');
  }
  return result;
};

const getAllIngredients = async (query: Record<string, unknown>) => {
  const ingredientQuery = new QueryBuilder(
    Ingredient.find({ isDeleted: false }),
    query,
  )
    .search(IngredientsSearchFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await ingredientQuery.modelQuery;
  const meta = await ingredientQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

export const IngredientsServices = {
  createIngredient,
  updateIngredient,
  getIngredientDetails,
  getAllIngredients,
};
