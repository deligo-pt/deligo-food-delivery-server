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

export const IngredientsController = {
    createIngredient
}