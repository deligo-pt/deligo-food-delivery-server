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
import { flattenObject } from '../../utils/flattenObject';
import { TMessageKey } from '../../errors/messages';

const createIngredient = async (
  payload: TIngredients,
  currentUser: TCurrentUser,
) => {
  // 1. Role Validation
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    throw new AppError(httpStatus.FORBIDDEN, 'ONLY_ADMIN_CAN_PERFORM_ACTION');
  }

  const isTaxExist = await Tax.findOne({
    _id: payload.tax,
    isDeleted: false,
    isActive: true,
  });

  if (!isTaxExist) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'TAX_CONFIGURATION_INVALID_OR_INACTIVE',
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
  payload.totalAddedQuantity = payload.stock;

  // 5. Database Insertion
  const newIngredient = await Ingredient.create(payload);

  return {
    messageKey: 'INGREDIENT_CREATED_SUCCESS' as TMessageKey,
    data: newIngredient,
  };
};

const updateIngredient = async (
  ingredientId: string,
  payload: Partial<TIngredients>,
) => {
  const ingredient = await Ingredient.findById(ingredientId);
  if (!ingredient) {
    throw new AppError(httpStatus.NOT_FOUND, 'INGREDIENT_NOT_FOUND');
  }

  if (payload.tax) {
    const isTaxExist = await Tax.findOne({
      _id: payload.tax,
      isDeleted: false,
      isActive: true,
    });
    if (!isTaxExist) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'TAX_CONFIGURATION_INVALID_FOR_UPDATE',
      );
    }
  }

  if (payload.stock !== undefined) {
    const stockDifference = payload.stock - ingredient.stock;

    payload.totalAddedQuantity =
      ingredient.totalAddedQuantity + stockDifference;
  }

  if (payload.image && ingredient.image) {
    const oldImage = ingredient.image;
    deleteSingleImageFromCloudinary(oldImage).catch((error) => {
      console.error('Cloudinary delete error:', error);
    });
  }

  if (payload.category) {
    payload.category = payload.category.toUpperCase().trim();
  }

  const flattenedData = flattenObject(payload);

  const updatedIngredient = await Ingredient.findByIdAndUpdate(
    ingredientId,
    { $set: flattenedData },
    { new: true, runValidators: true },
  );

  return {
    messageKey: 'INGREDIENT_UPDATED_SUCCESS' as TMessageKey,
    data: updatedIngredient,
  };
};

const getIngredientDetails = async (sku: string) => {
  const result = await Ingredient.findOne({ sku }).populate('tax', 'taxRate');
  if (!result || result.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'INGREDIENT_NOT_FOUND');
  }
  return {
    messageKey: 'INGREDIENT_DETAILS_RETRIEVED_SUCCESS' as TMessageKey,
    data: result,
  };
};

const getAllIngredients = async (query: Record<string, unknown>) => {
  const ingredientQuery = new QueryBuilder(
    Ingredient.find({ isDeleted: false }).populate('tax', 'taxRate'),
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
    messageKey: 'INGREDIENTS_RETRIEVED_SUCCESS' as TMessageKey,
    meta,
    data: result,
  };
};

const softDeleteIngredient = async (ingredientId: string) => {
  const ingredient = await Ingredient.findById(ingredientId);

  if (!ingredient || ingredient.isDeleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'INGREDIENT_NOT_FOUND_OR_ALREADY_DELETED',
    );
  }

  // Soft delete workflow: Update flags
  await Ingredient.findByIdAndUpdate(
    ingredientId,
    {
      $set: {
        isDeleted: true,
      },
    },
    { new: true },
  );

  return {
    messageKey: 'INGREDIENT_SOFT_DELETED_SUCCESS' as TMessageKey,
    data: null,
  };
};

const permanentDeleteIngredient = async (ingredientId: string) => {
  const ingredient = await Ingredient.findById(ingredientId);

  if (!ingredient) {
    throw new AppError(httpStatus.NOT_FOUND, 'INGREDIENT_NOT_FOUND');
  }

  if (!ingredient.isDeleted) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'SOFT_DELETE_REQUIRED_BEFORE_PERMANENT_DELETE',
    );
  }

  // 1. Wipe out images from Cloudinary storage right away
  if (ingredient.image) {
    deleteSingleImageFromCloudinary(ingredient.image).catch((error) => {
      console.error('Cloudinary wipe failed for permanent delete:', error);
    });
  }

  // 2. Completely remove the record from MongoDB
  const result = await Ingredient.findByIdAndDelete(ingredientId);

  return {
    messageKey: 'INGREDIENT_PERMANENTLY_REMOVED_SUCCESS' as TMessageKey,
    data: result,
  };
};

export const IngredientsServices = {
  createIngredient,
  updateIngredient,
  getIngredientDetails,
  getAllIngredients,
  softDeleteIngredient,
  permanentDeleteIngredient,
};
