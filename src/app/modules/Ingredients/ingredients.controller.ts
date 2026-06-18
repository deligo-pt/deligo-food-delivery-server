import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { IngredientsServices } from './ingredients.service';

const createIngredient = catchAsync(async (req, res) => {
  const result = await IngredientsServices.createIngredient(
    req.body,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Ingredient created successfully',
    data: result,
  });
});

const updateIngredient = catchAsync(async (req, res) => {
  const { ingredientId } = req.params;

  const result = await IngredientsServices.updateIngredient(
    ingredientId,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Ingredient updated successfully',
    data: result,
  });
});

const getIngredientDetails = catchAsync(async (req, res) => {
  const { sku } = req.params;
  const result = await IngredientsServices.getIngredientDetails(sku);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Ingredient details retrieved successfully',
    data: result,
  });
});

const getAllIngredients = catchAsync(async (req, res) => {
  const result = await IngredientsServices.getAllIngredients(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Ingredients retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const softDeleteIngredient = catchAsync(async (req, res) => {
  const { ingredientId } = req.params;
  const result = await IngredientsServices.softDeleteIngredient(ingredientId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Ingredient soft deleted successfully',
    data: result,
  });
});

const permanentDeleteIngredient = catchAsync(async (req, res) => {
  const { ingredientId } = req.params;
  const result =
    await IngredientsServices.permanentDeleteIngredient(ingredientId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Ingredient permanently removed from database',
    data: result,
  });
});

export const IngredientsController = {
  createIngredient,
  updateIngredient,
  getIngredientDetails,
  getAllIngredients,
  softDeleteIngredient,
  permanentDeleteIngredient,
};
