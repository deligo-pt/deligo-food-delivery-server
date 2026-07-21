import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { IngredientsServices } from './ingredients.service';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

const createIngredient = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await IngredientsServices.createIngredient(
    req.body,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created Ingredient',
    target: req.body?.name || `Ingredient #${req.body?.sku}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const updateIngredient = catchAsync(async (req, res) => {
  const { ingredientId } = req.params;
  const currentUser = req.user as TCurrentUser;

  const result = await IngredientsServices.updateIngredient(
    ingredientId,
    req.body,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Ingredient',
    target: req.body?.name || `Ingredient #${ingredientId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const getIngredientDetails = catchAsync(async (req, res) => {
  const { sku } = req.params;
  const result = await IngredientsServices.getIngredientDetails(sku);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

const getAllIngredients = catchAsync(async (req, res) => {
  const result = await IngredientsServices.getAllIngredients(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: result?.data,
  });
});

const softDeleteIngredient = catchAsync(async (req, res) => {
  const { ingredientId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await IngredientsServices.softDeleteIngredient(ingredientId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted Ingredient',
    target: `Ingredient #${ingredientId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const permanentDeleteIngredient = catchAsync(async (req, res) => {
  const { ingredientId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result =
    await IngredientsServices.permanentDeleteIngredient(ingredientId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Permanently Deleted Ingredient',
    target: `Ingredient #${ingredientId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
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
