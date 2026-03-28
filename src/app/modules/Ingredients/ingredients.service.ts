import httpStatus from "http-status";
import { AuthUser } from "../../constant/user.constant";
import AppError from "../../errors/AppError";
import { IIngredients } from "./ingredients.interface";
import { Ingredient } from "./ingredients.model";


const createIngredient = async (
    payload: IIngredients,
    currentUser: AuthUser,
    file: string,
) => {

    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
        throw new AppError(
            httpStatus.FORBIDDEN,
            'Only administrators can perform this action',
        );
    }

    const formattedCategory = payload.category.toUpperCase().trim();
    payload.category = formattedCategory;

    const categorySuffix = formattedCategory.substring(0, 3);
    const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();


    payload.sku = `ING-${categorySuffix}-${shortId}`;
    payload.image = file;

    const newIngredient = await Ingredient.create(payload);

    return newIngredient;
};


export const IngredientsServices = {
    createIngredient
};