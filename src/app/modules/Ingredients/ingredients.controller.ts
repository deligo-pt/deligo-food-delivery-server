import httpStatus from "http-status";
import { AuthUser } from "../../constant/user.constant";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { IngredientsServices } from "./ingredients.service";
import { TImageFile } from "../../interfaces/image.interface";


const createIngredient = catchAsync(async (req, res) => {
    const file = req.file as TImageFile;

    const result = await IngredientsServices.createIngredient(
        req.body,
        req.user as AuthUser,
        file?.path
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: 'Ingredient created successfully',
        data: result,
    });
});

const updateIngredient = catchAsync(async (req, res) => {
    const { id } = req.params;
    const file = req.file as TImageFile;

    const result = await IngredientsServices.updateIngredient(
        id,
        req.body,
        file?.path
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: 'Ingredient updated successfully',
        data: result,
    });
});

const getIngredientDetails = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await IngredientsServices.getIngredientDetails(id);

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

export const IngredientsController = {
    createIngredient,
    updateIngredient,
    getIngredientDetails,
    getAllIngredients
}