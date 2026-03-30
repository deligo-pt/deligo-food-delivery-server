import httpStatus from "http-status";
import { AuthUser } from "../../constant/user.constant";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { IngredientOrderService } from "./ing-order.service";


const confirmIngredientOrder = catchAsync(async (req, res) => {
    const result = await IngredientOrderService.confirmIngredientOrder(
        req.body,
        req.user as AuthUser
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Ingredient order confirmed successfully',
        data: result,
    });
});


export const IngredientOrderController = {
    confirmIngredientOrder,
};