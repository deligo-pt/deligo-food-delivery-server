import httpStatus from "http-status";
import { AuthUser } from "../../constant/user.constant";
import AppError from "../../errors/AppError";
import { IIngredients } from "./ingredients.interface";
import { Ingredient } from "./ingredients.model";
import { deleteSingleImageFromCloudinary } from "../../utils/deleteImage";
import { QueryBuilder } from "../../builder/QueryBuilder";
import { IngredientsSearchFields } from "./ingredients.constant";


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

const updateIngredient = async (
    id: string,
    payload: Partial<IIngredients>,
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