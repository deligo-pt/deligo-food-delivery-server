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

const getMyIngredientOrders = catchAsync(async (req, res) => {
    const result = await IngredientOrderService.getMyIngredientOrders(
        req.query,
        req.user as AuthUser
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Ingredient orders retrieved successfully',
        meta: result.meta,
        data: result.data,
    });
});

const getAllIngredientOrdersForAdmin = catchAsync(async (req, res) => {
    const result = await IngredientOrderService.getAllIngredientOrdersForAdmin(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'All ingredient orders retrieved successfully',
        meta: result.meta,
        data: result.data,
    });
});

const getSingleIngredientOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const result = await IngredientOrderService.getSingleIngredientOrder(orderId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Order details retrieved successfully',
        data: result,
    });
});


const updateIngredientOrderStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const currentUser = req.user as AuthUser;

    const result = await IngredientOrderService.updateIngredientOrderStatus(id, status, currentUser);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Order status updated to ${status}`,
        data: result,
    });
});

export const IngredientOrderController = {
    confirmIngredientOrder,
    getMyIngredientOrders,
    getAllIngredientOrdersForAdmin,
    getSingleIngredientOrder,
    updateIngredientOrderStatus,
};